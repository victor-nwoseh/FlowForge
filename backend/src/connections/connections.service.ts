import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Model } from 'mongoose';

import { encrypt, decrypt } from '../common/utils/encryption.util';
import { Connection, ConnectionDocument } from './schemas/connection.schema';

type ConnectionSummary = {
  service: Connection['service'];
  metadata: Connection['metadata'];
  createdAt: Date;
  hasToken: boolean;
};

@Injectable()
export class ConnectionsService {
  private readonly encryptionKey: string;

  constructor(
    @InjectModel(Connection.name)
    private readonly connectionModel: Model<ConnectionDocument>,
    private readonly configService: ConfigService,
  ) {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');

    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }

    this.encryptionKey = encryptionKey;
  }

  async create(
    userId: string,
    service: string,
    tokens: { accessToken: string; refreshToken?: string; expiresAt?: Date },
    metadata?: any,
  ): Promise<Connection> {
    const encryptedAccessToken = encrypt(tokens.accessToken, this.encryptionKey);
    const encryptedRefreshToken = tokens.refreshToken
      ? encrypt(tokens.refreshToken, this.encryptionKey)
      : null;

    const connection = await this.connectionModel.findOneAndUpdate(
      { userId, service },
      {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: tokens.expiresAt,
        metadata,
        updatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return connection;
  }

  async findByUserAndService(userId: string, service: string): Promise<Connection | null> {
    const connection = await this.connectionModel.findOne({ userId, service });

    if (!connection) {
      return null;
    }

    const connectionObj = connection.toObject();
    connectionObj.accessToken = decrypt(connectionObj.accessToken, this.encryptionKey);
    connectionObj.refreshToken = connectionObj.refreshToken
      ? decrypt(connectionObj.refreshToken, this.encryptionKey)
      : undefined;

    return connectionObj as Connection;
  }

  async findAllByUser(userId: string): Promise<ConnectionSummary[]> {
    const connections = await this.connectionModel
      .find({ userId })
      .select('service metadata createdAt accessToken')
      .lean<Connection[]>();

    return connections.map((connection) => ({
      service: connection.service,
      metadata: connection.metadata,
      createdAt: connection.createdAt,
      hasToken: Boolean(connection.accessToken),
    }));
  }

  async delete(userId: string, service: string): Promise<boolean> {
    const result = await this.connectionModel.deleteOne({ userId, service });

    return result.deletedCount === 1;
  }

  async refreshGoogleToken(userId: string): Promise<Connection> {
    const connection = await this.connectionModel.findOne({ userId, service: 'google' });

    if (!connection) {
      throw new NotFoundException('Google connection not found for user');
    }

    const refreshTokenEncrypted = connection.refreshToken;

    if (!refreshTokenEncrypted) {
      throw new NotFoundException('No refresh token found for Google connection');
    }

    const decryptedRefreshToken = decrypt(refreshTokenEncrypted, this.encryptionKey);
    const now = new Date();

    if (connection.expiresAt && now <= connection.expiresAt) {
      const decryptedAccessToken = decrypt(connection.accessToken, this.encryptionKey);

      const connectionObj = connection.toObject();
      connectionObj.accessToken = decryptedAccessToken;
      connectionObj.refreshToken = decryptedRefreshToken;

      return connectionObj as Connection;
    }

    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required');
    }

    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: decryptedRefreshToken,
      grant_type: 'refresh_token',
    });

    const { access_token, expires_in } = tokenResponse.data;
    const newExpiresAt = new Date(Date.now() + (expires_in ?? 0) * 1000);
    const encryptedAccessToken = encrypt(access_token, this.encryptionKey);

    connection.set('accessToken', encryptedAccessToken);
    connection.set('expiresAt', newExpiresAt);
    await connection.save();

    const connectionObj = connection.toObject();
    connectionObj.accessToken = decrypt(connectionObj.accessToken, this.encryptionKey);
    connectionObj.refreshToken = decryptedRefreshToken;

    return connectionObj as Connection;
  }
}

