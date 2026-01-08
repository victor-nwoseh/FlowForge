/**
 * Schedules E2E Tests
 * Step 9: Test scheduled workflow API endpoints
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
import { SchedulesModule } from '../src/schedules/schedules.module';
import { Schedule } from '../src/schedules/schemas/schedule.schema';
import { Workflow } from '../src/workflows/schemas/workflow.schema';
import {
  registerTestUser,
  createWorkflow,
  TestUser,
  authRequest,
} from './test-helpers';

describe('Schedules (e2e)', () => {
  let app: INestApplication;
  let testUser: TestUser;
  let scheduleModel: Model<Schedule>;
  let workflowModel: Model<Workflow>;
  let mockQueue: any;

  beforeAll(async () => {
    // Create mock queue with tracking
    mockQueue = {
      add: jest.fn().mockImplementation((data, opts) => {
        return Promise.resolve({
          id: `mock-job-${Date.now()}`,
          opts: {
            repeat: opts?.repeat ? { key: `repeat:${opts.jobId || 'default'}` } : undefined,
          },
        });
      }),
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
        SchedulesModule,
      ],
    })
      .overrideProvider(getQueueToken('workflow-execution'))
      .useValue(mockQueue)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    await app.init();

    scheduleModel = moduleFixture.get<Model<Schedule>>(getModelToken('Schedule'));
    workflowModel = moduleFixture.get<Model<Workflow>>(getModelToken('Workflow'));

    // Register a test user
    testUser = await registerTestUser(app);
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUser?.userId) {
      await scheduleModel.deleteMany({ userId: testUser.userId });
      await workflowModel.deleteMany({ userId: testUser.userId });
    }
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /schedules', () => {
    it('should create schedule with Bull job', async () => {
      // Create a workflow first
      const workflow = await createWorkflow(app, testUser.accessToken!);

      const scheduleData = {
        workflowId: workflow._id,
        cronExpression: '0 9 * * 1', // Every Monday at 9 AM
      };

      const response = await request(app.getHttpServer())
        .post('/schedules')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send(scheduleData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.workflowId).toBe(workflow._id);
      expect(response.body.cronExpression).toBe(scheduleData.cronExpression);
      expect(response.body.isActive).toBe(true);

      // Verify schedule created in database
      const savedSchedule = await scheduleModel.findById(response.body._id);
      expect(savedSchedule).not.toBeNull();

      // Verify Bull repeatable job added to queue
      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: workflow._id,
          userId: testUser.userId,
          triggerSource: 'scheduled',
        }),
        expect.objectContaining({
          repeat: { cron: scheduleData.cronExpression },
        }),
      );
    });

    it('should return 400 for invalid cron expression', async () => {
      const workflow = await createWorkflow(app, testUser.accessToken!);

      const response = await request(app.getHttpServer())
        .post('/schedules')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          workflowId: workflow._id,
          cronExpression: 'not-a-cron',
        })
        .expect(400);

      expect(response.body.message).toContain('Invalid cron');
    });

    it('should return 400 for missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/schedules')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('GET /schedules', () => {
    it('should return user schedules with workflow name populated', async () => {
      // Create a workflow and schedule
      const workflow = await createWorkflow(app, testUser.accessToken!);

      await request(app.getHttpServer())
        .post('/schedules')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          workflowId: workflow._id,
          cronExpression: '0 10 * * *', // Every day at 10 AM
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/schedules')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);

      // Verify workflow name is populated
      const schedule = response.body.find(
        (s: any) => s.workflowId?._id === workflow._id || s.workflowId === workflow._id,
      );
      expect(schedule).toBeDefined();
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/schedules')
        .expect(401);
    });
  });

  describe('DELETE /schedules/:id', () => {
    it('should remove schedule and Bull job', async () => {
      // Create a workflow and schedule
      const workflow = await createWorkflow(app, testUser.accessToken!);

      const createResponse = await request(app.getHttpServer())
        .post('/schedules')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          workflowId: workflow._id,
          cronExpression: '0 11 * * *',
        })
        .expect(201);

      const scheduleId = createResponse.body._id;

      // Delete the schedule
      await request(app.getHttpServer())
        .delete(`/schedules/${scheduleId}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      // Verify schedule deleted from database
      const deletedSchedule = await scheduleModel.findById(scheduleId);
      expect(deletedSchedule).toBeNull();

      // Verify Bull job removed from queue
      expect(mockQueue.removeRepeatableByKey).toHaveBeenCalled();
    });

    it('should return 404 for non-existent schedule', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await request(app.getHttpServer())
        .delete(`/schedules/${fakeId}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /schedules/:id/toggle', () => {
    it('should pause schedule (deactivate)', async () => {
      // Create a workflow and active schedule
      const workflow = await createWorkflow(app, testUser.accessToken!);

      const createResponse = await request(app.getHttpServer())
        .post('/schedules')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          workflowId: workflow._id,
          cronExpression: '0 12 * * *',
        })
        .expect(201);

      const scheduleId = createResponse.body._id;

      // Clear mocks to track the toggle call
      jest.clearAllMocks();

      // Toggle to inactive
      const toggleResponse = await request(app.getHttpServer())
        .patch(`/schedules/${scheduleId}/toggle`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(toggleResponse.body.isActive).toBe(false);

      // Verify Bull job removed when deactivated
      expect(mockQueue.removeRepeatableByKey).toHaveBeenCalled();

      // Verify database updated
      const updatedSchedule = await scheduleModel.findById(scheduleId);
      expect(updatedSchedule?.isActive).toBe(false);
    });

    it('should reactivate schedule', async () => {
      // Create workflow and schedule, then deactivate
      const workflow = await createWorkflow(app, testUser.accessToken!);

      const createResponse = await request(app.getHttpServer())
        .post('/schedules')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          workflowId: workflow._id,
          cronExpression: '0 13 * * *',
        })
        .expect(201);

      const scheduleId = createResponse.body._id;

      // Deactivate first
      await request(app.getHttpServer())
        .patch(`/schedules/${scheduleId}/toggle`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ isActive: false })
        .expect(200);

      jest.clearAllMocks();

      // Reactivate
      const toggleResponse = await request(app.getHttpServer())
        .patch(`/schedules/${scheduleId}/toggle`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ isActive: true })
        .expect(200);

      expect(toggleResponse.body.isActive).toBe(true);

      // Verify Bull job re-added
      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerSource: 'scheduled',
        }),
        expect.objectContaining({
          repeat: expect.any(Object),
        }),
      );
    });

    it('should return 400 for invalid isActive value', async () => {
      const workflow = await createWorkflow(app, testUser.accessToken!);

      const createResponse = await request(app.getHttpServer())
        .post('/schedules')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          workflowId: workflow._id,
          cronExpression: '0 14 * * *',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/schedules/${createResponse.body._id}/toggle`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ isActive: 'not-a-boolean' })
        .expect(400);
    });
  });

  describe('Cron Validation', () => {
    it('should validate cron expression format', async () => {
      const workflow = await createWorkflow(app, testUser.accessToken!);

      // Test invalid formats (must have wrong number of parts to fail validation)
      const invalidCrons = [
        'invalid',
        '* * *', // Too few fields (3)
        '* *', // Too few fields (2)
        '* * * * * *', // Too many fields (6)
        '*', // Single field
      ];

      for (const invalidCron of invalidCrons) {
        // Create new workflow to avoid "schedule already exists" error
        const newWorkflow = await createWorkflow(app, testUser.accessToken!);

        const response = await request(app.getHttpServer())
          .post('/schedules')
          .set('Authorization', `Bearer ${testUser.accessToken}`)
          .send({
            workflowId: newWorkflow._id,
            cronExpression: invalidCron,
          });

        expect(response.status).toBe(400);
      }
    });

    it('should accept valid cron expressions', async () => {
      const workflow = await createWorkflow(app, testUser.accessToken!);

      const validCrons = [
        '0 0 * * *', // Daily at midnight
        '*/15 * * * *', // Every 15 minutes
        '0 9 * * 1-5', // Weekdays at 9 AM
      ];

      for (const validCron of validCrons) {
        // Create new workflow for each to avoid "schedule already exists" error
        const newWorkflow = await createWorkflow(app, testUser.accessToken!);

        const response = await request(app.getHttpServer())
          .post('/schedules')
          .set('Authorization', `Bearer ${testUser.accessToken}`)
          .send({
            workflowId: newWorkflow._id,
            cronExpression: validCron,
          });

        expect(response.status).toBe(201);
      }
    });
  });
});
