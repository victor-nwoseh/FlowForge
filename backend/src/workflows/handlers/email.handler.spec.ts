import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

import { EmailHandler } from './email.handler';
import { ConnectionsService } from '../../connections/connections.service';
import { ExecutionContext } from '../../executions/interfaces/execution.interface';

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
      })),
    },
    gmail: jest.fn(),
  },
}));

describe('EmailHandler', () => {
  let handler: EmailHandler;
  let connectionsService: jest.Mocked<ConnectionsService>;
  let configService: jest.Mocked<ConfigService>;
  let mockGmailSend: jest.Mock;

  const mockUserId = 'test-user-id';
  const mockAccessToken = 'google-access-token';
  const mockRefreshToken = 'google-refresh-token';

  beforeEach(async () => {
    const mockConnectionsService = {
      findByUserAndService: jest.fn(),
      refreshGoogleToken: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, any> = {
          GOOGLE_CLIENT_ID: 'google-client-id',
          GOOGLE_CLIENT_SECRET: 'google-client-secret',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailHandler,
        { provide: ConnectionsService, useValue: mockConnectionsService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    handler = module.get<EmailHandler>(EmailHandler);
    connectionsService = module.get(ConnectionsService);
    configService = module.get(ConfigService);

    // Setup Gmail API mock
    mockGmailSend = jest.fn().mockResolvedValue({
      data: { id: 'mock-message-id' },
    });

    (google.gmail as jest.Mock).mockReturnValue({
      users: {
        messages: {
          send: mockGmailSend,
        },
      },
    });

    jest.clearAllMocks();
  });

  const createContext = (userId: string = mockUserId): ExecutionContext => ({
    variables: {},
    trigger: {},
    userId,
  });

  describe('execute', () => {
    it('should send email with Gmail API', async () => {
      const mockConnection = {
        userId: mockUserId,
        service: 'google',
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        expiresAt: new Date(Date.now() + 3600000),
        metadata: { email: 'sender@gmail.com' },
      };

      connectionsService.findByUserAndService.mockResolvedValue(mockConnection as any);

      // Re-setup mock after clearAllMocks
      mockGmailSend.mockResolvedValue({ data: { id: 'mock-message-id' } });
      (google.gmail as jest.Mock).mockReturnValue({
        users: { messages: { send: mockGmailSend } },
      });

      const nodeData = {
        config: {
          to: 'recipient@example.com',
          subject: 'Test Subject',
          body: 'Test email body',
        },
      };

      const result = await handler.execute(nodeData, createContext());

      expect(result.success).toBe(true);
      expect(result.output.sent).toBe(true);
      expect(result.output.messageId).toBe('mock-message-id');
      expect(mockGmailSend).toHaveBeenCalledWith({
        userId: 'me',
        requestBody: {
          raw: expect.any(String),
        },
      });
    });

    it('should refresh token if expired', async () => {
      const expiredDate = new Date(Date.now() - 3600000);
      const mockExpiredConnection = {
        userId: mockUserId,
        service: 'google',
        accessToken: 'old-token',
        refreshToken: mockRefreshToken,
        expiresAt: expiredDate,
        metadata: { email: 'sender@gmail.com' },
      };

      const mockRefreshedConnection = {
        userId: mockUserId,
        service: 'google',
        accessToken: 'new-access-token',
        refreshToken: mockRefreshToken,
        expiresAt: new Date(Date.now() + 3600000),
        metadata: { email: 'sender@gmail.com' },
      };

      connectionsService.findByUserAndService.mockResolvedValue(mockExpiredConnection as any);
      connectionsService.refreshGoogleToken.mockResolvedValue(mockRefreshedConnection as any);

      mockGmailSend.mockResolvedValue({ data: { id: 'mock-message-id' } });
      (google.gmail as jest.Mock).mockReturnValue({
        users: { messages: { send: mockGmailSend } },
      });

      const nodeData = {
        config: {
          to: 'recipient@example.com',
          subject: 'Test Subject',
          body: 'Test email body',
        },
      };

      const result = await handler.execute(nodeData, createContext());

      expect(result.success).toBe(true);
      expect(connectionsService.refreshGoogleToken).toHaveBeenCalledWith(mockUserId);
    });

    it('should return error if Gmail not connected', async () => {
      connectionsService.findByUserAndService.mockResolvedValue(null);

      const nodeData = {
        config: {
          to: 'recipient@example.com',
          subject: 'Test Subject',
          body: 'Test email body',
        },
      };

      const result = await handler.execute(nodeData, createContext());

      expect(result.success).toBe(false);
      expect(result.error).toContain('Gmail not connected');
    });

    it('should return error if userId is missing', async () => {
      const nodeData = {
        config: {
          to: 'recipient@example.com',
          subject: 'Test Subject',
          body: 'Test email body',
        },
      };

      const context = createContext();
      delete (context as any).userId;

      const result = await handler.execute(nodeData, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID missing');
    });

    it('should return error for missing to field', async () => {
      const mockConnection = {
        userId: mockUserId,
        service: 'google',
        accessToken: mockAccessToken,
        expiresAt: new Date(Date.now() + 3600000),
        metadata: { email: 'sender@gmail.com' },
      };

      connectionsService.findByUserAndService.mockResolvedValue(mockConnection as any);

      const nodeData = {
        config: {
          subject: 'Test Subject',
          body: 'Test email body',
        },
      };

      const result = await handler.execute(nodeData, createContext());

      expect(result.success).toBe(false);
      expect(result.error).toContain('"to" field');
    });

    it('should return error for missing subject field', async () => {
      const mockConnection = {
        userId: mockUserId,
        service: 'google',
        accessToken: mockAccessToken,
        expiresAt: new Date(Date.now() + 3600000),
        metadata: { email: 'sender@gmail.com' },
      };

      connectionsService.findByUserAndService.mockResolvedValue(mockConnection as any);

      const nodeData = {
        config: {
          to: 'recipient@example.com',
          body: 'Test email body',
        },
      };

      const result = await handler.execute(nodeData, createContext());

      expect(result.success).toBe(false);
      expect(result.error).toContain('"subject" field');
    });

    it('should return error for missing body field', async () => {
      const mockConnection = {
        userId: mockUserId,
        service: 'google',
        accessToken: mockAccessToken,
        expiresAt: new Date(Date.now() + 3600000),
        metadata: { email: 'sender@gmail.com' },
      };

      connectionsService.findByUserAndService.mockResolvedValue(mockConnection as any);

      const nodeData = {
        config: {
          to: 'recipient@example.com',
          subject: 'Test Subject',
        },
      };

      const result = await handler.execute(nodeData, createContext());

      expect(result.success).toBe(false);
      expect(result.error).toContain('"body" field');
    });

    it('should replace variables in email fields', async () => {
      const mockConnection = {
        userId: mockUserId,
        service: 'google',
        accessToken: mockAccessToken,
        expiresAt: new Date(Date.now() + 3600000),
        metadata: { email: 'sender@gmail.com' },
      };

      connectionsService.findByUserAndService.mockResolvedValue(mockConnection as any);

      mockGmailSend.mockResolvedValue({ data: { id: 'mock-message-id' } });
      (google.gmail as jest.Mock).mockReturnValue({
        users: { messages: { send: mockGmailSend } },
      });

      const nodeData = {
        config: {
          to: '{{variables.recipient}}',
          subject: 'Hello {{variables.name}}',
          body: 'Your order {{variables.orderId}} is ready',
        },
      };

      const context = createContext();
      context.variables = {
        recipient: 'user@example.com',
        name: 'John',
        orderId: '12345',
      };

      const result = await handler.execute(nodeData, context);

      expect(result.success).toBe(true);
      expect(mockGmailSend).toHaveBeenCalled();

      // Verify the raw email contains the replaced variables
      const callArgs = mockGmailSend.mock.calls[0][0];
      const rawEmail = Buffer.from(callArgs.requestBody.raw, 'base64').toString();
      expect(rawEmail).toContain('To: user@example.com');
      expect(rawEmail).toContain('Subject: Hello John');
      expect(rawEmail).toContain('Your order 12345 is ready');
    });

    it('should handle Gmail API errors', async () => {
      const mockConnection = {
        userId: mockUserId,
        service: 'google',
        accessToken: mockAccessToken,
        expiresAt: new Date(Date.now() + 3600000),
        metadata: { email: 'sender@gmail.com' },
      };

      connectionsService.findByUserAndService.mockResolvedValue(mockConnection as any);

      mockGmailSend.mockRejectedValue(new Error('Gmail API request failed'));
      (google.gmail as jest.Mock).mockReturnValue({
        users: { messages: { send: mockGmailSend } },
      });

      const nodeData = {
        config: {
          to: 'recipient@example.com',
          subject: 'Test Subject',
          body: 'Test email body',
        },
      };

      const result = await handler.execute(nodeData, createContext());

      expect(result.success).toBe(false);
      expect(result.error).toContain('Gmail API request failed');
    });
  });
});
