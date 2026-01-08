/**
 * WebSocket E2E Tests
 * Step 11: Test real-time execution event emissions
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Model, Types } from 'mongoose';
import { BullModule, getQueueToken } from '@nestjs/bull';
import { io, Socket } from 'socket.io-client';

import { UsersModule } from '../src/users/users.module';
import { AuthModule } from '../src/auth/auth.module';
import { WorkflowsModule } from '../src/workflows/workflows.module';
import { ConnectionsModule } from '../src/connections/connections.module';
import { ExecutionsModule } from '../src/executions/executions.module';
import { ExecutionGateway } from '../src/executions/gateways/execution.gateway';
import { Workflow } from '../src/workflows/schemas/workflow.schema';
import { Execution } from '../src/executions/schemas/execution.schema';
import {
  registerTestUser,
  createWorkflow,
  TestUser,
  delay,
} from './test-helpers';

describe('WebSocket (e2e)', () => {
  let app: INestApplication;
  let testUser: TestUser;
  let secondUser: TestUser;
  let workflowModel: Model<Workflow>;
  let executionModel: Model<Execution>;
  let executionGateway: ExecutionGateway;
  let jwtService: JwtService;
  let mockQueue: any;
  let serverUrl: string;

  beforeAll(async () => {
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
      process: jest.fn(),
      on: jest.fn(),
      getJob: jest.fn().mockResolvedValue(null),
      getJobs: jest.fn().mockResolvedValue([]),
      removeRepeatableByKey: jest.fn().mockResolvedValue(true),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET: 'test-jwt-secret-for-e2e',
              JWT_EXPIRES_IN: '1d',
              ENCRYPTION_KEY: 'test-encryption-key-32ch',
              SLACK_CLIENT_ID: 'test-slack-client-id',
              SLACK_CLIENT_SECRET: 'test-slack-client-secret',
              SLACK_REDIRECT_URI: 'http://localhost:3001/api/auth/slack/callback',
              GOOGLE_CLIENT_ID: 'test-google-client-id',
              GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
              GOOGLE_REDIRECT_URI: 'http://localhost:3001/api/auth/google/callback',
              FRONTEND_URL: 'http://localhost:5173',
            }),
          ],
        }),
        MongooseModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            uri:
              configService.get<string>('MONGODB_URI_TEST') ||
              configService.get<string>('MONGODB_URI') ||
              'mongodb://localhost:27017/flowforge-test',
          }),
          inject: [ConfigService],
        }),
        BullModule.forRoot({
          redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
          },
        }),
        UsersModule,
        AuthModule,
        WorkflowsModule,
        ConnectionsModule,
        ExecutionsModule,
      ],
    })
      .overrideProvider(getQueueToken('workflow-execution'))
      .useValue(mockQueue)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    await app.init();
    await app.listen(0); // Random available port

    const address = app.getHttpServer().address();
    const port = typeof address === 'string' ? address : address?.port;
    serverUrl = `http://localhost:${port}`;

    workflowModel = moduleFixture.get<Model<Workflow>>(getModelToken('Workflow'));
    executionModel = moduleFixture.get<Model<Execution>>(getModelToken('Execution'));
    executionGateway = moduleFixture.get<ExecutionGateway>(ExecutionGateway);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Register test users
    testUser = await registerTestUser(app);
    secondUser = await registerTestUser(app);
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUser?.userId) {
      await workflowModel.deleteMany({ userId: testUser.userId });
      await executionModel.deleteMany({ userId: testUser.userId });
    }
    if (secondUser?.userId) {
      await workflowModel.deleteMany({ userId: secondUser.userId });
      await executionModel.deleteMany({ userId: secondUser.userId });
    }
    await app.close();
  });

  /**
   * Helper to create a socket client with authentication
   */
  function createSocketClient(token: string): Socket {
    return io(serverUrl, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
    });
  }

  /**
   * Helper to wait for socket event with timeout
   */
  function waitForEvent(socket: Socket, event: string, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      socket.once(event, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  describe('Socket Connection', () => {
    it('should connect with valid JWT token', async () => {
      const socket = createSocketClient(testUser.accessToken!);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          socket.disconnect();
          reject(new Error('Connection timeout'));
        }, 5000);

        socket.on('connect', () => {
          clearTimeout(timeout);
          expect(socket.connected).toBe(true);
          socket.disconnect();
          resolve();
        });

        socket.on('connect_error', (err) => {
          clearTimeout(timeout);
          socket.disconnect();
          reject(err);
        });
      });
    });

    it('should disconnect with invalid token', async () => {
      const socket = createSocketClient('invalid-token');

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          // If we timeout without connecting, test passes
          socket.disconnect();
          resolve();
        }, 3000);

        socket.on('connect', () => {
          clearTimeout(timeout);
          // Socket should be disconnected by server
          // Wait a bit for server to disconnect us
          setTimeout(() => {
            expect(socket.connected).toBe(false);
            socket.disconnect();
            resolve();
          }, 500);
        });

        socket.on('disconnect', () => {
          clearTimeout(timeout);
          expect(socket.connected).toBe(false);
          resolve();
        });

        socket.on('connect_error', () => {
          clearTimeout(timeout);
          socket.disconnect();
          resolve();
        });
      });
    });

    it('should disconnect without token', async () => {
      const socket = io(serverUrl, {
        transports: ['websocket'],
        forceNew: true,
      });

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          socket.disconnect();
          resolve();
        }, 3000);

        socket.on('disconnect', () => {
          clearTimeout(timeout);
          expect(socket.connected).toBe(false);
          resolve();
        });

        socket.on('connect_error', () => {
          clearTimeout(timeout);
          socket.disconnect();
          resolve();
        });
      });
    });
  });

  describe('Execution Events', () => {
    it('should emit execution:started event', async () => {
      const socket = createSocketClient(testUser.accessToken!);

      await new Promise<void>((resolve, reject) => {
        socket.on('connect', () => resolve());
        socket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      const executionId = new Types.ObjectId().toString();
      const workflowId = new Types.ObjectId().toString();

      // Set up event listener before emitting
      const eventPromise = waitForEvent(socket, 'execution:started');

      // Emit event via gateway
      executionGateway.emitExecutionStarted(executionId, workflowId, testUser.userId!);

      const eventData = await eventPromise;

      expect(eventData).toHaveProperty('executionId', executionId);
      expect(eventData).toHaveProperty('workflowId', workflowId);
      expect(eventData).toHaveProperty('timestamp');

      socket.disconnect();
    });

    it('should emit execution:node-completed event', async () => {
      const socket = createSocketClient(testUser.accessToken!);

      await new Promise<void>((resolve, reject) => {
        socket.on('connect', () => resolve());
        socket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      const executionId = new Types.ObjectId().toString();
      const nodeId = 'test-node-1';
      const nodeType = 'http';

      const eventPromise = waitForEvent(socket, 'execution:node-completed');

      executionGateway.emitNodeCompleted(
        executionId,
        nodeId,
        nodeType,
        'success',
        testUser.userId!,
      );

      const eventData = await eventPromise;

      expect(eventData).toHaveProperty('executionId', executionId);
      expect(eventData).toHaveProperty('nodeId', nodeId);
      expect(eventData).toHaveProperty('nodeType', nodeType);
      expect(eventData).toHaveProperty('status', 'success');
      expect(eventData).toHaveProperty('timestamp');

      socket.disconnect();
    });

    it('should emit execution:completed event', async () => {
      const socket = createSocketClient(testUser.accessToken!);

      await new Promise<void>((resolve, reject) => {
        socket.on('connect', () => resolve());
        socket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      const executionId = new Types.ObjectId().toString();
      const workflowId = new Types.ObjectId().toString();

      const eventPromise = waitForEvent(socket, 'execution:completed');

      executionGateway.emitExecutionCompleted(
        executionId,
        'success',
        testUser.userId!,
        workflowId,
      );

      const eventData = await eventPromise;

      expect(eventData).toHaveProperty('executionId', executionId);
      expect(eventData).toHaveProperty('status', 'success');
      expect(eventData).toHaveProperty('workflowId', workflowId);
      expect(eventData).toHaveProperty('timestamp');

      socket.disconnect();
    });

    it('should emit execution:progress event', async () => {
      const socket = createSocketClient(testUser.accessToken!);

      await new Promise<void>((resolve, reject) => {
        socket.on('connect', () => resolve());
        socket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      const executionId = new Types.ObjectId().toString();
      const workflowId = new Types.ObjectId().toString();

      const eventPromise = waitForEvent(socket, 'execution:progress');

      executionGateway.emitExecutionProgress(
        executionId,
        3,
        5,
        testUser.userId!,
        workflowId,
      );

      const eventData = await eventPromise;

      expect(eventData).toHaveProperty('executionId', executionId);
      expect(eventData).toHaveProperty('completed', 3);
      expect(eventData).toHaveProperty('total', 5);
      expect(eventData).toHaveProperty('percentage', 60);
      expect(eventData).toHaveProperty('workflowId', workflowId);

      socket.disconnect();
    });
  });

  describe('User Isolation', () => {
    it('should only emit to correct user room (User A receives, User B does not)', async () => {
      // Connect both users
      const socketA = createSocketClient(testUser.accessToken!);
      const socketB = createSocketClient(secondUser.accessToken!);

      // Wait for both connections
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          socketA.on('connect', () => resolve());
          socketA.on('connect_error', reject);
          setTimeout(() => reject(new Error('Socket A connection timeout')), 5000);
        }),
        new Promise<void>((resolve, reject) => {
          socketB.on('connect', () => resolve());
          socketB.on('connect_error', reject);
          setTimeout(() => reject(new Error('Socket B connection timeout')), 5000);
        }),
      ]);

      const executionId = new Types.ObjectId().toString();
      const workflowId = new Types.ObjectId().toString();

      // Track received events
      let userAReceived = false;
      let userBReceived = false;

      socketA.on('execution:started', () => {
        userAReceived = true;
      });

      socketB.on('execution:started', () => {
        userBReceived = true;
      });

      // Emit event for User A only
      executionGateway.emitExecutionStarted(executionId, workflowId, testUser.userId!);

      // Wait a bit for events to propagate
      await delay(500);

      // User A should receive the event
      expect(userAReceived).toBe(true);

      // User B should NOT receive the event
      expect(userBReceived).toBe(false);

      socketA.disconnect();
      socketB.disconnect();
    });

    it('should emit to User B when event is for User B', async () => {
      const socketA = createSocketClient(testUser.accessToken!);
      const socketB = createSocketClient(secondUser.accessToken!);

      await Promise.all([
        new Promise<void>((resolve, reject) => {
          socketA.on('connect', () => resolve());
          socketA.on('connect_error', reject);
          setTimeout(() => reject(new Error('Socket A connection timeout')), 5000);
        }),
        new Promise<void>((resolve, reject) => {
          socketB.on('connect', () => resolve());
          socketB.on('connect_error', reject);
          setTimeout(() => reject(new Error('Socket B connection timeout')), 5000);
        }),
      ]);

      const executionId = new Types.ObjectId().toString();
      const workflowId = new Types.ObjectId().toString();

      let userAReceived = false;
      let userBReceived = false;

      socketA.on('execution:started', () => {
        userAReceived = true;
      });

      socketB.on('execution:started', () => {
        userBReceived = true;
      });

      // Emit event for User B only
      executionGateway.emitExecutionStarted(executionId, workflowId, secondUser.userId!);

      await delay(500);

      // User A should NOT receive the event
      expect(userAReceived).toBe(false);

      // User B should receive the event
      expect(userBReceived).toBe(true);

      socketA.disconnect();
      socketB.disconnect();
    });
  });

  describe('Multiple Events in Sequence', () => {
    it('should receive all events for a complete execution flow', async () => {
      const socket = createSocketClient(testUser.accessToken!);

      await new Promise<void>((resolve, reject) => {
        socket.on('connect', () => resolve());
        socket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      const executionId = new Types.ObjectId().toString();
      const workflowId = new Types.ObjectId().toString();

      const receivedEvents: string[] = [];

      socket.on('execution:started', () => receivedEvents.push('started'));
      socket.on('execution:progress', () => receivedEvents.push('progress'));
      socket.on('execution:node-completed', () => receivedEvents.push('node-completed'));
      socket.on('execution:completed', () => receivedEvents.push('completed'));

      // Simulate execution flow
      executionGateway.emitExecutionStarted(executionId, workflowId, testUser.userId!);
      await delay(50);

      executionGateway.emitExecutionProgress(executionId, 1, 3, testUser.userId!, workflowId);
      await delay(50);

      executionGateway.emitNodeCompleted(executionId, 'node-1', 'http', 'success', testUser.userId!);
      await delay(50);

      executionGateway.emitExecutionProgress(executionId, 2, 3, testUser.userId!, workflowId);
      await delay(50);

      executionGateway.emitNodeCompleted(executionId, 'node-2', 'delay', 'success', testUser.userId!);
      await delay(50);

      executionGateway.emitExecutionProgress(executionId, 3, 3, testUser.userId!, workflowId);
      await delay(50);

      executionGateway.emitNodeCompleted(executionId, 'node-3', 'slack', 'success', testUser.userId!);
      await delay(50);

      executionGateway.emitExecutionCompleted(executionId, 'success', testUser.userId!, workflowId);
      await delay(100);

      // Verify all events received
      expect(receivedEvents).toContain('started');
      expect(receivedEvents).toContain('progress');
      expect(receivedEvents).toContain('node-completed');
      expect(receivedEvents).toContain('completed');

      // Verify order (started should be first, completed should be last)
      expect(receivedEvents[0]).toBe('started');
      expect(receivedEvents[receivedEvents.length - 1]).toBe('completed');

      socket.disconnect();
    });
  });
});
