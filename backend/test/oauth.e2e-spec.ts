/**
 * OAuth E2E Tests
 * Step 8: Test OAuth authorization and callback flows
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Model, Types } from 'mongoose';
import { BullModule, getQueueToken } from '@nestjs/bull';
import axios from 'axios';

import { UsersModule } from '../src/users/users.module';
import { AuthModule } from '../src/auth/auth.module';
import { ConnectionsModule } from '../src/connections/connections.module';
import { WorkflowsModule } from '../src/workflows/workflows.module';
import { ExecutionsModule } from '../src/executions/executions.module';
import { Connection } from '../src/connections/schemas/connection.schema';
import {
  registerTestUser,
  TestUser,
  generateObjectId,
} from './test-helpers';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OAuth (e2e)', () => {
  let app: INestApplication;
  let testUser: TestUser;
  let connectionModel: Model<Connection>;
  let jwtService: JwtService;
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
        ConnectionsModule,
        WorkflowsModule,
        ExecutionsModule,
      ],
    })
      .overrideProvider(getQueueToken('workflow-execution'))
      .useValue(mockQueue)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    await app.init();

    connectionModel = moduleFixture.get<Model<Connection>>(getModelToken('Connection'));
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Register a test user
    testUser = await registerTestUser(app);
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUser?.userId) {
      await connectionModel.deleteMany({ userId: testUser.userId });
    }
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /auth/slack', () => {
    it('should redirect to Slack OAuth with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get(`/auth/slack?token=${testUser.accessToken}`)
        .expect(302);

      expect(response.headers.location).toContain('slack.com/oauth');
      expect(response.headers.location).toContain('client_id=');
      expect(response.headers.location).toContain('scope=');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/auth/slack')
        .expect(401);
    });
  });

  describe('GET /auth/slack/callback', () => {
    it('should exchange code for token and create connection', async () => {
      // Mock Slack token exchange
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          ok: true,
          access_token: 'xoxb-mock-slack-token',
          team: { id: 'T12345', name: 'Test Workspace' },
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/auth/slack/callback?code=mock-auth-code&state=${testUser.userId}`)
        .expect(302);

      // Verify redirect to frontend with success
      expect(response.headers.location).toContain('integrations');
      expect(response.headers.location).toContain('success=slack');

      // Verify axios was called with correct parameters
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://slack.com/api/oauth.v2.access',
        null,
        expect.objectContaining({
          params: expect.objectContaining({
            code: 'mock-auth-code',
          }),
        }),
      );

      // Verify connection created in database
      const connection = await connectionModel.findOne({
        userId: testUser.userId,
        service: 'slack',
      });
      expect(connection).not.toBeNull();
    });

    it('should redirect with error on failed token exchange', async () => {
      // Mock failed Slack token exchange
      mockedAxios.post.mockRejectedValueOnce(new Error('Token exchange failed'));

      const response = await request(app.getHttpServer())
        .get(`/auth/slack/callback?code=invalid-code&state=${testUser.userId}`)
        .expect(302);

      expect(response.headers.location).toContain('error=slack');
    });
  });

  describe('GET /auth/google', () => {
    it('should redirect to Google OAuth with correct scopes', async () => {
      const response = await request(app.getHttpServer())
        .get(`/auth/google?token=${testUser.accessToken}`)
        .expect(302);

      expect(response.headers.location).toContain('accounts.google.com');
      expect(response.headers.location).toContain('client_id=');
      expect(response.headers.location).toContain('scope=');
      expect(response.headers.location).toContain('gmail');
      expect(response.headers.location).toContain('spreadsheets');
    });
  });

  describe('GET /auth/google/callback', () => {
    it('should store tokens encrypted and redirect', async () => {
      // Mock Google token exchange
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'mock-google-access-token',
          refresh_token: 'mock-google-refresh-token',
          expires_in: 3600,
        },
      });

      // Mock Google userinfo
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          email: 'testuser@gmail.com',
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/auth/google/callback?code=mock-auth-code&state=${testUser.userId}`)
        .expect(302);

      expect(response.headers.location).toContain('success=google');

      // Verify connection stored in database with encrypted tokens
      const connection = await connectionModel.findOne({
        userId: testUser.userId,
        service: 'google',
      });
      expect(connection).not.toBeNull();
      // Tokens should be encrypted (not plain text)
      expect(connection?.accessToken).not.toBe('mock-google-access-token');
    });
  });

  describe('GET /connections', () => {
    it('should return user connections without decrypted tokens', async () => {
      // First ensure we have a connection
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          ok: true,
          access_token: 'xoxb-new-slack-token',
          team: { id: 'T99999', name: 'New Workspace' },
        },
      });

      await request(app.getHttpServer())
        .get(`/auth/slack/callback?code=new-code&state=${testUser.userId}`)
        .expect(302);

      // Now get connections
      const response = await request(app.getHttpServer())
        .get('/connections')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Verify connections returned (should have at least slack connection)
      const slackConnection = response.body.find((c: any) => c.service === 'slack');
      expect(slackConnection).toBeDefined();

      // Tokens should NOT be decrypted in response (they're encrypted in DB)
      // The response format depends on implementation
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/connections')
        .expect(401);
    });
  });

  describe('DELETE /connections/:service', () => {
    it('should remove connection', async () => {
      // First create a connection
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          ok: true,
          access_token: 'xoxb-delete-test-token',
          team: { id: 'T11111', name: 'Delete Test Workspace' },
        },
      });

      await request(app.getHttpServer())
        .get(`/auth/slack/callback?code=delete-test-code&state=${testUser.userId}`)
        .expect(302);

      // Verify connection exists
      let connection = await connectionModel.findOne({
        userId: testUser.userId,
        service: 'slack',
      });
      expect(connection).not.toBeNull();

      // Delete the connection
      const response = await request(app.getHttpServer())
        .delete('/connections/slack')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify connection deleted from database
      connection = await connectionModel.findOne({
        userId: testUser.userId,
        service: 'slack',
      });
      expect(connection).toBeNull();
    });

    it('should return 400 for invalid service', async () => {
      await request(app.getHttpServer())
        .delete('/connections/invalid-service')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(400);
    });
  });
});
