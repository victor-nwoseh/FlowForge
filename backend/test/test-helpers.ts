/**
 * E2E Test Helpers
 * Common utilities for integration testing
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Types } from 'mongoose';

/**
 * Test user credentials
 */
export interface TestUser {
  email: string;
  password: string;
  accessToken?: string;
  userId?: string;
}

/**
 * Creates a unique test user with timestamp to avoid collisions
 */
export function createTestUserCredentials(prefix = 'testuser'): TestUser {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return {
    email: `${prefix}-${timestamp}-${random}@test.com`,
    password: 'TestPassword123!',
  };
}

/**
 * Registers a new user and returns credentials with access token
 */
export async function registerTestUser(
  app: INestApplication,
  credentials?: TestUser,
): Promise<TestUser> {
  const user = credentials || createTestUserCredentials();

  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      email: user.email,
      password: user.password,
    })
    .expect(201);

  return {
    ...user,
    accessToken: response.body.access_token,
    userId: response.body.user?.id || response.body.user?._id,
  };
}

/**
 * Logs in an existing user and returns access token
 */
export async function loginTestUser(
  app: INestApplication,
  credentials: TestUser,
): Promise<TestUser> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({
      email: credentials.email,
      password: credentials.password,
    })
    .expect(201);

  return {
    ...credentials,
    accessToken: response.body.access_token,
    userId: response.body.user?.id || response.body.user?._id,
  };
}

/**
 * Creates a test workflow
 */
export function createTestWorkflowData(overrides: Partial<any> = {}) {
  return {
    name: `Test Workflow ${Date.now()}`,
    description: 'A test workflow for e2e testing',
    nodes: [
      {
        id: 'webhook-1',
        type: 'webhook',
        position: { x: 100, y: 100 },
        data: {
          type: 'webhook',
          label: 'Webhook Trigger',
          config: {},
        },
      },
      {
        id: 'http-1',
        type: 'http',
        position: { x: 300, y: 100 },
        data: {
          type: 'http',
          label: 'HTTP Request',
          config: {
            method: 'GET',
            url: 'https://jsonplaceholder.typicode.com/posts/1',
          },
        },
      },
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'webhook-1',
        target: 'http-1',
      },
    ],
    ...overrides,
  };
}

/**
 * Creates a workflow via API and returns the created workflow
 */
export async function createWorkflow(
  app: INestApplication,
  accessToken: string,
  workflowData?: any,
): Promise<any> {
  const data = workflowData || createTestWorkflowData();

  const response = await request(app.getHttpServer())
    .post('/workflows')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(data)
    .expect(201);

  return response.body;
}

/**
 * Creates an execution record for testing
 */
export function createTestExecutionData(workflowId: string, userId: string) {
  return {
    workflowId: new Types.ObjectId(workflowId),
    userId: new Types.ObjectId(userId),
    status: 'success',
    triggerData: { body: { test: 'data' } },
    triggerSource: 'manual',
    logs: [
      {
        nodeId: 'trigger-1',
        nodeName: 'Webhook Trigger',
        status: 'success',
        startTime: new Date(),
        endTime: new Date(),
        duration: 100,
        output: { received: true },
      },
    ],
    startTime: new Date(),
    endTime: new Date(),
    duration: 1000,
  };
}

/**
 * Helper to make authenticated requests
 */
export function authRequest(app: INestApplication, accessToken: string) {
  return {
    get: (url: string) =>
      request(app.getHttpServer())
        .get(url)
        .set('Authorization', `Bearer ${accessToken}`),
    post: (url: string) =>
      request(app.getHttpServer())
        .post(url)
        .set('Authorization', `Bearer ${accessToken}`),
    put: (url: string) =>
      request(app.getHttpServer())
        .put(url)
        .set('Authorization', `Bearer ${accessToken}`),
    patch: (url: string) =>
      request(app.getHttpServer())
        .patch(url)
        .set('Authorization', `Bearer ${accessToken}`),
    delete: (url: string) =>
      request(app.getHttpServer())
        .delete(url)
        .set('Authorization', `Bearer ${accessToken}`),
  };
}

/**
 * Generates a valid MongoDB ObjectId string
 */
export function generateObjectId(): string {
  return new Types.ObjectId().toString();
}

/**
 * Delays execution for specified milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
