import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';

import { SlackHandler } from './slack.handler';
import { ConnectionsService } from '../../connections/connections.service';
import { ExecutionContext } from '../../executions/interfaces/execution.interface';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SlackHandler', () => {
  let handler: SlackHandler;
  let connectionsService: jest.Mocked<ConnectionsService>;

  const mockUserId = 'test-user-id';
  const mockAccessToken = 'xoxb-test-token';

  beforeEach(async () => {
    const mockConnectionsService = {
      findByUserAndService: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlackHandler,
        { provide: ConnectionsService, useValue: mockConnectionsService },
      ],
    }).compile();

    handler = module.get<SlackHandler>(SlackHandler);
    connectionsService = module.get(ConnectionsService);

    jest.clearAllMocks();
  });

  const createContext = (userId: string = mockUserId): ExecutionContext => ({
    variables: {},
    trigger: {},
    userId,
  });

  describe('execute', () => {
    it('should send Slack message with user OAuth token', async () => {
      const mockConnection = {
        userId: mockUserId,
        service: 'slack',
        accessToken: mockAccessToken,
        metadata: { teamId: 'T12345', teamName: 'Test Team' },
      };

      connectionsService.findByUserAndService.mockResolvedValue(mockConnection as any);

      mockedAxios.post.mockResolvedValue({
        data: { ok: true, ts: '1234567890.123456' },
      });

      const nodeData = {
        config: {
          message: 'Hello from test!',
          channel: '#general',
        },
      };

      const result = await handler.execute(nodeData, createContext());

      expect(result.success).toBe(true);
      expect(result.output.sent).toBe(true);
      expect(result.output.message).toBe('Hello from test!');

      expect(connectionsService.findByUserAndService).toHaveBeenCalledWith(
        mockUserId,
        'slack',
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://slack.com/api/chat.postMessage',
        expect.objectContaining({
          channel: '#general',
          text: 'Hello from test!',
        }),
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );
    });

    it('should return error if Slack not connected', async () => {
      connectionsService.findByUserAndService.mockResolvedValue(null);

      const nodeData = {
        config: {
          message: 'Hello!',
          channel: '#general',
        },
      };

      const result = await handler.execute(nodeData, createContext());

      expect(result.success).toBe(false);
      expect(result.error).toContain('Slack not connected');
    });

    it('should return error if userId is missing', async () => {
      const nodeData = {
        config: {
          message: 'Hello!',
          channel: '#general',
        },
      };

      const context = createContext();
      delete (context as any).userId;

      const result = await handler.execute(nodeData, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID missing');
    });

    it('should use #general as default channel', async () => {
      const mockConnection = {
        userId: mockUserId,
        service: 'slack',
        accessToken: mockAccessToken,
        metadata: {},
      };

      connectionsService.findByUserAndService.mockResolvedValue(mockConnection as any);

      mockedAxios.post.mockResolvedValue({
        data: { ok: true },
      });

      const nodeData = {
        config: {
          message: 'Hello!',
        },
      };

      await handler.execute(nodeData, createContext());

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://slack.com/api/chat.postMessage',
        expect.objectContaining({
          channel: '#general',
        }),
        expect.any(Object),
      );
    });

    it('should replace variables in message', async () => {
      const mockConnection = {
        userId: mockUserId,
        service: 'slack',
        accessToken: mockAccessToken,
        metadata: {},
      };

      connectionsService.findByUserAndService.mockResolvedValue(mockConnection as any);

      mockedAxios.post.mockResolvedValue({
        data: { ok: true },
      });

      const nodeData = {
        config: {
          message: 'Hello {{variables.name}}!',
          channel: '#general',
        },
      };

      const context = createContext();
      context.variables = { name: 'World' };

      const result = await handler.execute(nodeData, context);

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://slack.com/api/chat.postMessage',
        expect.objectContaining({
          text: 'Hello World!',
        }),
        expect.any(Object),
      );
    });

    it('should return error for empty message', async () => {
      const mockConnection = {
        userId: mockUserId,
        service: 'slack',
        accessToken: mockAccessToken,
        metadata: {},
      };

      connectionsService.findByUserAndService.mockResolvedValue(mockConnection as any);

      const nodeData = {
        config: {
          message: '',
          channel: '#general',
        },
      };

      const result = await handler.execute(nodeData, createContext());

      expect(result.success).toBe(false);
      expect(result.error).toContain('non-empty string');
    });

    it('should handle Slack API error response', async () => {
      const mockConnection = {
        userId: mockUserId,
        service: 'slack',
        accessToken: mockAccessToken,
        metadata: {},
      };

      connectionsService.findByUserAndService.mockResolvedValue(mockConnection as any);

      mockedAxios.post.mockResolvedValue({
        data: { ok: false, error: 'channel_not_found' },
      });

      const nodeData = {
        config: {
          message: 'Hello!',
          channel: '#nonexistent',
        },
      };

      const result = await handler.execute(nodeData, createContext());

      expect(result.success).toBe(false);
      expect(result.error).toContain('channel_not_found');
    });

    it('should handle network errors', async () => {
      const mockConnection = {
        userId: mockUserId,
        service: 'slack',
        accessToken: mockAccessToken,
        metadata: {},
      };

      connectionsService.findByUserAndService.mockResolvedValue(mockConnection as any);

      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const nodeData = {
        config: {
          message: 'Hello!',
          channel: '#general',
        },
      };

      const result = await handler.execute(nodeData, createContext());

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });
});
