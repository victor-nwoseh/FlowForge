/**
 * Workflows E2E Tests
 * Step 7: Test workflows API endpoints with supertest
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Model, Types } from 'mongoose';
import { BullModule, getQueueToken } from '@nestjs/bull';

import { UsersModule } from '../src/users/users.module';
import { AuthModule } from '../src/auth/auth.module';
import { WorkflowsModule } from '../src/workflows/workflows.module';
import { ConnectionsModule } from '../src/connections/connections.module';
import { ExecutionsModule } from '../src/executions/executions.module';
import { Workflow } from '../src/workflows/schemas/workflow.schema';
import {
  registerTestUser,
  createTestWorkflowData,
  createWorkflow,
  authRequest,
  TestUser,
  generateObjectId,
} from './test-helpers';

describe('Workflows (e2e)', () => {
  let app: INestApplication;
  let testUser: TestUser;
  let workflowModel: Model<Workflow>;
  let mockQueue: any;

  beforeAll(async () => {
    // Create mock queue
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

    workflowModel = moduleFixture.get<Model<Workflow>>(getModelToken('Workflow'));

    // Register a test user
    testUser = await registerTestUser(app);
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUser?.userId) {
      await workflowModel.deleteMany({ userId: testUser.userId });
    }
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /workflows', () => {
    it('should create workflow', async () => {
      const workflowData = createTestWorkflowData();

      const response = await request(app.getHttpServer())
        .post('/workflows')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send(workflowData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.name).toBe(workflowData.name);
      expect(response.body.description).toBe(workflowData.description);
      expect(response.body.nodes).toHaveLength(2);
      expect(response.body.edges).toHaveLength(1);

      // Verify workflow saved to database
      const savedWorkflow = await workflowModel.findById(response.body._id);
      expect(savedWorkflow).not.toBeNull();
      expect(savedWorkflow?.name).toBe(workflowData.name);
    });

    it('should return 401 without auth token', async () => {
      const workflowData = createTestWorkflowData();

      await request(app.getHttpServer())
        .post('/workflows')
        .send(workflowData)
        .expect(401);
    });
  });

  describe('GET /workflows', () => {
    it('should return user workflows', async () => {
      // Create a workflow first
      const createdWorkflow = await createWorkflow(app, testUser.accessToken!);

      const response = await request(app.getHttpServer())
        .get('/workflows')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);

      // Verify only authenticated user's workflows returned
      const workflowIds = response.body.map((w: any) => w._id);
      expect(workflowIds).toContain(createdWorkflow._id);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/workflows')
        .expect(401);
    });
  });

  describe('GET /workflows/:id', () => {
    it('should return single workflow', async () => {
      const createdWorkflow = await createWorkflow(app, testUser.accessToken!);

      const response = await request(app.getHttpServer())
        .get(`/workflows/${createdWorkflow._id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(response.body._id).toBe(createdWorkflow._id);
      expect(response.body.name).toBe(createdWorkflow.name);
      expect(response.body.nodes).toHaveLength(createdWorkflow.nodes.length);
    });

    it('should return 404 for non-existent workflow', async () => {
      const fakeId = generateObjectId();

      await request(app.getHttpServer())
        .get(`/workflows/${fakeId}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(404);
    });
  });

  describe('PUT /workflows/:id', () => {
    it('should update workflow', async () => {
      const createdWorkflow = await createWorkflow(app, testUser.accessToken!);
      const updatedData = {
        name: 'Updated Workflow Name',
        description: 'Updated description',
      };

      const response = await request(app.getHttpServer())
        .put(`/workflows/${createdWorkflow._id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send(updatedData)
        .expect(200);

      expect(response.body.name).toBe(updatedData.name);
      expect(response.body.description).toBe(updatedData.description);

      // Verify changes persisted
      const savedWorkflow = await workflowModel.findById(createdWorkflow._id);
      expect(savedWorkflow?.name).toBe(updatedData.name);
    });
  });

  describe('DELETE /workflows/:id', () => {
    it('should delete workflow', async () => {
      const createdWorkflow = await createWorkflow(app, testUser.accessToken!);

      await request(app.getHttpServer())
        .delete(`/workflows/${createdWorkflow._id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      // Verify workflow removed from database
      const deletedWorkflow = await workflowModel.findById(createdWorkflow._id);
      expect(deletedWorkflow).toBeNull();
    });
  });

  describe('POST /workflows/:id/execute', () => {
    it('should start execution and add job to Bull queue', async () => {
      const createdWorkflow = await createWorkflow(app, testUser.accessToken!);

      const response = await request(app.getHttpServer())
        .post(`/workflows/${createdWorkflow._id}/execute`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ triggerData: { test: 'data' } })
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Workflow execution started');
      expect(response.body).toHaveProperty('jobId');

      // Verify Bull job added to queue
      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: createdWorkflow._id,
          userId: testUser.userId,
          triggerSource: 'manual',
        }),
      );
    });

    it('should return 404 for non-existent workflow execution', async () => {
      const fakeId = generateObjectId();

      await request(app.getHttpServer())
        .post(`/workflows/${fakeId}/execute`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({})
        .expect(404);
    });
  });

  describe('User Isolation', () => {
    it('should not allow access to other users workflows', async () => {
      // Create workflow with first user
      const createdWorkflow = await createWorkflow(app, testUser.accessToken!);

      // Create second user
      const secondUser = await registerTestUser(app);

      // Try to access first user's workflow with second user's token
      await request(app.getHttpServer())
        .get(`/workflows/${createdWorkflow._id}`)
        .set('Authorization', `Bearer ${secondUser.accessToken}`)
        .expect(404);

      // Cleanup second user's data
      await workflowModel.deleteMany({ userId: secondUser.userId });
    });
  });
});
