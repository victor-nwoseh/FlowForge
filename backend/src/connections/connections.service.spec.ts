import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import axios from 'axios';

import { ConnectionsService } from './connections.service';
import { Connection } from './schemas/connection.schema';
import { encrypt, decrypt } from '../common/utils/encryption.util';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ConnectionsService', () => {
  let service: ConnectionsService;
  let connectionModel: any;

  const mockUserId = new Types.ObjectId().toString();
  const encryptionKey = 'test-encryption-key-32chars!!';
  const mockAccessToken = 'xoxb-slack-access-token';
  const mockRefreshToken = 'refresh-token-12345';

  beforeEach(async () => {
    const mockConnectionModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      find: jest.fn(),
      deleteOne: jest.fn(),
      create: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, any> = {
          ENCRYPTION_KEY: encryptionKey,
          GOOGLE_CLIENT_ID: 'google-client-id',
          GOOGLE_CLIENT_SECRET: 'google-client-secret',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectionsService,
        { provide: getModelToken(Connection.name), useValue: mockConnectionModel },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ConnectionsService>(ConnectionsService);
    connectionModel = module.get(getModelToken(Connection.name));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create connection with encrypted tokens', async () => {
      const tokens = {
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        expiresAt: new Date('2025-01-01'),
      };
      const metadata = { teamId: 'T12345', teamName: 'Test Team' };

      const savedConnection = {
        _id: new Types.ObjectId(),
        userId: mockUserId,
        service: 'slack',
        accessToken: encrypt(mockAccessToken, encryptionKey),
        refreshToken: encrypt(mockRefreshToken, encryptionKey),
        expiresAt: tokens.expiresAt,
        metadata,
      };

      connectionModel.findOneAndUpdate.mockResolvedValue(savedConnection);

      const result = await service.create(mockUserId, 'slack', tokens, metadata);

      expect(connectionModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: mockUserId, service: 'slack' },
        expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          expiresAt: tokens.expiresAt,
          metadata,
        }),
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      const callArgs = connectionModel.findOneAndUpdate.mock.calls[0][1];
      expect(callArgs.accessToken).not.toBe(mockAccessToken);
      expect(callArgs.refreshToken).not.toBe(mockRefreshToken);

      expect(result).toEqual(savedConnection);
    });
  });

  describe('findByUserAndService', () => {
    it('should find connection and decrypt tokens', async () => {
      const encryptedAccessToken = encrypt(mockAccessToken, encryptionKey);
      const encryptedRefreshToken = encrypt(mockRefreshToken, encryptionKey);

      const storedConnection = {
        _id: new Types.ObjectId(),
        userId: mockUserId,
        service: 'slack',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        metadata: { teamId: 'T12345' },
        toObject: jest.fn().mockReturnValue({
          _id: new Types.ObjectId(),
          userId: mockUserId,
          service: 'slack',
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          metadata: { teamId: 'T12345' },
        }),
      };

      connectionModel.findOne.mockResolvedValue(storedConnection);

      const result = await service.findByUserAndService(mockUserId, 'slack');

      expect(connectionModel.findOne).toHaveBeenCalledWith({
        userId: mockUserId,
        service: 'slack',
      });

      expect(result).not.toBeNull();
      expect(result!.accessToken).toBe(mockAccessToken);
      expect(result!.refreshToken).toBe(mockRefreshToken);
    });

    it('should return null if connection not found', async () => {
      connectionModel.findOne.mockResolvedValue(null);

      const result = await service.findByUserAndService(mockUserId, 'slack');

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete connection', async () => {
      connectionModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const result = await service.delete(mockUserId, 'slack');

      expect(connectionModel.deleteOne).toHaveBeenCalledWith({
        userId: mockUserId,
        service: 'slack',
      });
      expect(result).toBe(true);
    });

    it('should return false if connection not found', async () => {
      connectionModel.deleteOne.mockResolvedValue({ deletedCount: 0 });

      const result = await service.delete(mockUserId, 'slack');

      expect(result).toBe(false);
    });
  });

  describe('refreshGoogleToken', () => {
    it('should refresh Google token when expired', async () => {
      const expiredDate = new Date(Date.now() - 3600000);
      const encryptedAccessToken = encrypt('old-access-token', encryptionKey);
      const encryptedRefreshToken = encrypt(mockRefreshToken, encryptionKey);

      const storedConnection = {
        _id: new Types.ObjectId(),
        userId: mockUserId,
        service: 'google',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: expiredDate,
        metadata: { email: 'test@gmail.com' },
        set: jest.fn(),
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({
          _id: new Types.ObjectId(),
          userId: mockUserId,
          service: 'google',
          accessToken: encrypt('new-access-token', encryptionKey),
          refreshToken: encryptedRefreshToken,
          expiresAt: new Date(Date.now() + 3600000),
          metadata: { email: 'test@gmail.com' },
        }),
      };

      connectionModel.findOne.mockResolvedValue(storedConnection);

      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'new-access-token',
          expires_in: 3600,
        },
      });

      const result = await service.refreshGoogleToken(mockUserId);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          client_id: 'google-client-id',
          client_secret: 'google-client-secret',
          refresh_token: mockRefreshToken,
          grant_type: 'refresh_token',
        }),
      );

      expect(storedConnection.set).toHaveBeenCalledWith('accessToken', expect.any(String));
      expect(storedConnection.set).toHaveBeenCalledWith('expiresAt', expect.any(Date));
      expect(storedConnection.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should return existing token if not expired', async () => {
      const futureDate = new Date(Date.now() + 3600000);
      const encryptedAccessToken = encrypt(mockAccessToken, encryptionKey);
      const encryptedRefreshToken = encrypt(mockRefreshToken, encryptionKey);

      const storedConnection = {
        _id: new Types.ObjectId(),
        userId: mockUserId,
        service: 'google',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: futureDate,
        metadata: { email: 'test@gmail.com' },
        toObject: jest.fn().mockReturnValue({
          _id: new Types.ObjectId(),
          userId: mockUserId,
          service: 'google',
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: futureDate,
          metadata: { email: 'test@gmail.com' },
        }),
      };

      connectionModel.findOne.mockResolvedValue(storedConnection);

      const result = await service.refreshGoogleToken(mockUserId);

      expect(mockedAxios.post).not.toHaveBeenCalled();
      expect(result.accessToken).toBe(mockAccessToken);
    });
  });
});
