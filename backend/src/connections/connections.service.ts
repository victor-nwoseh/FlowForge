import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Model } from 'mongoose';

import { encrypt, decrypt } from '../common/utils/encryption.util';
import { Connection, ConnectionDocument } from './schemas/connection.schema';

/** Summary view of a connection (without sensitive token data) */
type ConnectionSummary = {
  service: Connection['service'];
  metadata: Connection['metadata'];
  createdAt: Date;
  hasToken: boolean;
};

/**
 * ConnectionsService - Manages OAuth connections with encrypted token storage.
 *
 * This service handles:
 * - Storing OAuth access tokens and refresh tokens (encrypted with AES-256)
 * - Retrieving decrypted tokens for use in node handlers (Slack, Gmail, etc.)
 * - Refreshing expired Google OAuth tokens automatically
 * - Per-user isolation (User A cannot access User B's tokens)
 *
 * Security:
 * - All tokens are encrypted at rest using the ENCRYPTION_KEY environment variable
 * - Tokens are only decrypted when needed for API calls
 * - Connection summaries (for UI) never include actual token values
 *
 * @example
 * // Store a new Slack connection
 * await connectionsService.create(userId, 'slack', {
 *   accessToken: 'xoxb-...',
 *   refreshToken: undefined,
 * }, { teamName: 'My Workspace' });
 *
 * // Retrieve decrypted token for API use
 * const connection = await connectionsService.findByUserAndService(userId, 'slack');
 * // connection.accessToken is now decrypted
 */
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

  /**
   * Creates or updates an OAuth connection for a user.
   *
   * Tokens are encrypted before storage using AES-256 encryption.
   * If a connection already exists for this user/service pair, it will be updated.
   *
   * @param userId - The user's MongoDB ObjectId
   * @param service - Service identifier ('slack' | 'google')
   * @param tokens - OAuth tokens to store
   * @param tokens.accessToken - The access token (will be encrypted)
   * @param tokens.refreshToken - Optional refresh token (will be encrypted)
   * @param tokens.expiresAt - Optional token expiration date
   * @param metadata - Optional service-specific metadata (teamName, email, etc.)
   * @returns The created/updated connection document
   */
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

  /**
   * Retrieves a connection with decrypted tokens for API use.
   *
   * This method is used by node handlers (Slack, Email, Sheets) to get
   * the actual OAuth tokens needed for making API calls.
   *
   * @param userId - The user's MongoDB ObjectId
   * @param service - Service identifier ('slack' | 'google')
   * @returns Connection with decrypted tokens, or null if not found
   */
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

  /**
   * Lists all connections for a user (without exposing tokens).
   *
   * Returns connection summaries safe for displaying in the UI.
   * Actual token values are never included in the response.
   *
   * @param userId - The user's MongoDB ObjectId
   * @returns Array of connection summaries with service, metadata, and hasToken flag
   */
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

  /**
   * Removes an OAuth connection for a user.
   *
   * @param userId - The user's MongoDB ObjectId
   * @param service - Service identifier ('slack' | 'google')
   * @returns True if a connection was deleted, false if not found
   */
  async delete(userId: string, service: string): Promise<boolean> {
    const result = await this.connectionModel.deleteOne({ userId, service });

    return result.deletedCount === 1;
  }

  /**
   * Refreshes an expired Google OAuth token.
   *
   * This method checks if the current token is expired and, if so,
   * uses the refresh token to obtain a new access token from Google.
   * The new token is encrypted and stored in the database.
   *
   * Flow:
   * 1. Check if token is still valid (not expired)
   * 2. If valid, return current connection with decrypted tokens
   * 3. If expired, call Google's token endpoint with refresh token
   * 4. Encrypt and store new access token
   * 5. Return updated connection with decrypted tokens
   *
   * @param userId - The user's MongoDB ObjectId
   * @returns Connection with refreshed, decrypted tokens
   * @throws NotFoundException if no Google connection exists
   * @throws Error if refresh token is missing or Google API fails
   */
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

