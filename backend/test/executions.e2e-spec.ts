/**
 * Executions E2E Tests
 * Step 10: Test execution tracking and retrieval endpoints
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { BullModule, getQueueToken } from '@nestjs/bull';

import { UsersModule } from '../src/users/users.module';
import { AuthModule } from '../src/auth/auth.module';
import { WorkflowsModule } from '../src/workflows/workflows.module';
import { ConnectionsModule } from '../src/connections/connections.module';
import { ExecutionsModule } from '../src/executions/executions.module';
import { Execution } from '../src/executions/schemas/execution.schema';
import { Workflow } from '../src/workflows/schemas/workflow.schema';
import {
  registerTestUser,
  createWorkflow,
  TestUser,
  generateObjectId,
} from './test-helpers';

describe('Executions (e2e)', () => {
  let app: INestApplication;
  let testUser: TestUser;
  let executionModel: Model<Execution>;
  let workflowModel: Model<Workflow>;
  let mockQueue: any;

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

    executionModel = moduleFixture.get<Model<Execution>>(getModelToken('Execution'));
    workflowModel = moduleFixture.get<Model<Workflow>>(getModelToken('Workflow'));

    // Register a test user
    testUser = await registerTestUser(app);
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUser?.userId) {
      await executionModel.deleteMany({ userId: testUser.userId });
      await workflowModel.deleteMany({ userId: testUser.userId });
    }
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Helper to create test execution records directly in the database
   */
  async function createTestExecution(
    workflowId: string,
    userId: string,
    overrides: Partial<any> = {},
  ): Promise<any> {
    // Pass strings directly - Mongoose will convert to ObjectId based on schema
    const executionData = {
      workflowId,
      userId,
      status: 'success',
      triggerData: { body: { test: 'data' } },
      triggerSource: 'manual',
      logs: [
        {
          nodeId: 'webhook-1',
          nodeName: 'Webhook Trigger',
          status: 'success',
          startTime: new Date(),
          endTime: new Date(),
          duration: 100,
          output: { received: true },
        },
        {
          nodeId: 'http-1',
          nodeName: 'HTTP Request',
          status: 'success',
          startTime: new Date(),
          endTime: new Date(),
          duration: 500,
          output: { data: 'response' },
        },
      ],
      startTime: new Date(Date.now() - 1000),
      endTime: new Date(),
      duration: 1000,
      ...overrides,
    };

    const execution = await executionModel.create(executionData);
    return execution;
  }

  describe('GET /executions', () => {
    it('should return user executions sorted by startedAt descending', async () => {
      // Create a workflow
      const workflow = await createWorkflow(app, testUser.accessToken!);

      // Create multiple executions with different timestamps
      const execution1 = await createTestExecution(workflow._id, testUser.userId!, {
        startTime: new Date(Date.now() - 3000),
        createdAt: new Date(Date.now() - 3000),
      });
      const execution2 = await createTestExecution(workflow._id, testUser.userId!, {
        startTime: new Date(Date.now() - 2000),
        createdAt: new Date(Date.now() - 2000),
      });
      const execution3 = await createTestExecution(workflow._id, testUser.userId!, {
        startTime: new Date(Date.now() - 1000),
        createdAt: new Date(Date.now() - 1000),
      });

      const response = await request(app.getHttpServer())
        .get('/executions')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(3);

      // Verify sorted by createdAt descending (most recent first)
      const executionIds = response.body.map((e: any) => e._id);
      const idx1 = executionIds.indexOf(execution1._id.toString());
      const idx2 = executionIds.indexOf(execution2._id.toString());
      const idx3 = executionIds.indexOf(execution3._id.toString());

      // Most recent (execution3) should come first
      expect(idx3).toBeLessThan(idx2);
      expect(idx2).toBeLessThan(idx1);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/executions')
        .expect(401);
    });
  });

  describe('GET /executions/:id', () => {
    it('should return single execution with logs', async () => {
      const workflow = await createWorkflow(app, testUser.accessToken!);
      const execution = await createTestExecution(workflow._id, testUser.userId!);

      const response = await request(app.getHttpServer())
        .get(`/executions/${execution._id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(response.body._id).toBe(execution._id.toString());
      expect(response.body.status).toBe('success');
      expect(response.body.logs).toBeInstanceOf(Array);
      expect(response.body.logs.length).toBe(2);

      // Verify logs contain node statuses
      const nodeLog = response.body.logs.find((l: any) => l.nodeId === 'webhook-1');
      expect(nodeLog).toBeDefined();
      expect(nodeLog.status).toBe('success');
    });

    it('should return 404 for non-existent execution', async () => {
      const fakeId = generateObjectId();

      await request(app.getHttpServer())
        .get(`/executions/${fakeId}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(404);
    });

    it('should not return other users executions', async () => {
      // Create execution for first user
      const workflow = await createWorkflow(app, testUser.accessToken!);
      const execution = await createTestExecution(workflow._id, testUser.userId!);

      // Create second user
      const secondUser = await registerTestUser(app);

      // Try to access first user's execution with second user's token
      await request(app.getHttpServer())
        .get(`/executions/${execution._id}`)
        .set('Authorization', `Bearer ${secondUser.accessToken}`)
        .expect(404);

      // Cleanup
      await workflowModel.deleteMany({ userId: secondUser.userId });
      await executionModel.deleteMany({ userId: secondUser.userId });
    });
  });

  describe('GET /executions?workflowId=xxx (filter by workflowId)', () => {
    it('should filter executions by workflowId', async () => {
      // Create two workflows
      const workflow1 = await createWorkflow(app, testUser.accessToken!);
      const workflow2 = await createWorkflow(app, testUser.accessToken!);

      // Create executions for each workflow
      await createTestExecution(workflow1._id, testUser.userId!);
      await createTestExecution(workflow1._id, testUser.userId!);
      await createTestExecution(workflow2._id, testUser.userId!);

      // Filter by workflow1
      const response = await request(app.getHttpServer())
        .get(`/executions?workflowId=${workflow1._id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);

      // Verify all returned executions belong to workflow1
      response.body.forEach((exec: any) => {
        expect(exec.workflowId.toString()).toBe(workflow1._id.toString());
      });
    });
  });

  describe('Execution Status Filtering', () => {
    it('should return executions with different statuses', async () => {
      const workflow = await createWorkflow(app, testUser.accessToken!);

      // Create executions with different statuses
      await createTestExecution(workflow._id, testUser.userId!, { status: 'success' });
      await createTestExecution(workflow._id, testUser.userId!, { status: 'failed' });
      await createTestExecution(workflow._id, testUser.userId!, { status: 'running' });

      // Get all executions
      const response = await request(app.getHttpServer())
        .get('/executions')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      // Verify we have executions with different statuses
      const statuses = response.body.map((e: any) => e.status);
      expect(statuses).toContain('success');
      expect(statuses).toContain('failed');
      expect(statuses).toContain('running');
    });
  });

  describe('Execution Logs', () => {
    it('should include detailed node logs in execution', async () => {
      const workflow = await createWorkflow(app, testUser.accessToken!);

      const detailedLogs = [
        {
          nodeId: 'node-1',
          nodeName: 'HTTP Request',
          status: 'success',
          startTime: new Date(),
          endTime: new Date(),
          duration: 150,
          input: { url: 'https://api.example.com' },
          output: { status: 200, data: { result: 'ok' } },
        },
        {
          nodeId: 'node-2',
          nodeName: 'Condition',
          status: 'success',
          startTime: new Date(),
          endTime: new Date(),
          duration: 5,
          input: { condition: 'status === 200' },
          output: { result: true, branch: 'true' },
        },
        {
          nodeId: 'node-3',
          nodeName: 'Slack Notification',
          status: 'failed',
          startTime: new Date(),
          endTime: new Date(),
          duration: 200,
          input: { channel: '#alerts' },
          error: 'channel_not_found',
        },
      ];

      const execution = await createTestExecution(workflow._id, testUser.userId!, {
        status: 'failed',
        logs: detailedLogs,
        error: 'Node node-3 failed: channel_not_found',
      });

      const response = await request(app.getHttpServer())
        .get(`/executions/${execution._id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(response.body.logs).toHaveLength(3);
      expect(response.body.status).toBe('failed');
      expect(response.body.error).toContain('channel_not_found');

      // Verify failed node log
      const failedLog = response.body.logs.find((l: any) => l.status === 'failed');
      expect(failedLog).toBeDefined();
      expect(failedLog.nodeId).toBe('node-3');
      expect(failedLog.error).toBe('channel_not_found');
    });
  });

  describe('User Isolation', () => {
    it('should only return authenticated users executions', async () => {
      // Create executions for test user
      const workflow1 = await createWorkflow(app, testUser.accessToken!);
      await createTestExecution(workflow1._id, testUser.userId!);

      // Create second user with their own executions
      const secondUser = await registerTestUser(app);
      const workflow2 = await createWorkflow(app, secondUser.accessToken!);
      await createTestExecution(workflow2._id, secondUser.userId!);

      // Get executions for first user
      const response1 = await request(app.getHttpServer())
        .get('/executions')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      // All executions should belong to testUser
      response1.body.forEach((exec: any) => {
        expect(exec.userId.toString()).toBe(testUser.userId!.toString());
      });

      // Get executions for second user
      const response2 = await request(app.getHttpServer())
        .get('/executions')
        .set('Authorization', `Bearer ${secondUser.accessToken}`)
        .expect(200);

      // All executions should belong to secondUser
      response2.body.forEach((exec: any) => {
        expect(exec.userId.toString()).toBe(secondUser.userId!.toString());
      });

      // Cleanup second user
      await workflowModel.deleteMany({ userId: secondUser.userId });
      await executionModel.deleteMany({ userId: secondUser.userId });
    });
  });
});
