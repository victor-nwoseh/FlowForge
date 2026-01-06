import { Test, TestingModule, TestingModuleBuilder } from '@nestjs/testing';
import { ModuleMetadata } from '@nestjs/common';
import { Types } from 'mongoose';

/**
 * Creates a NestJS testing module with the given metadata
 */
export async function createTestingModule(
  metadata: ModuleMetadata,
): Promise<TestingModule> {
  const moduleBuilder: TestingModuleBuilder = Test.createTestingModule(metadata);
  return moduleBuilder.compile();
}

/**
 * Creates a mock Mongoose repository with common methods
 */
export function mockRepository() {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((dto) => ({
      ...dto,
      _id: new Types.ObjectId(),
      save: jest.fn().mockResolvedValue({ ...dto, _id: new Types.ObjectId() }),
    })),
    save: jest.fn().mockResolvedValue({}),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    findByIdAndUpdate: jest.fn().mockResolvedValue(null),
    findByIdAndDelete: jest.fn().mockResolvedValue(null),
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    countDocuments: jest.fn().mockResolvedValue(0),
    exec: jest.fn().mockResolvedValue(null),
  };
}

/**
 * Creates a mock ConfigService with common configuration values
 */
export function mockConfigService() {
  const configValues: Record<string, any> = {
    JWT_SECRET: 'test-jwt-secret',
    JWT_EXPIRES_IN: '1d',
    MONGODB_URI: 'mongodb://localhost:27017/test',
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    ENCRYPTION_KEY: 'test-encryption-key-32chars!!',
    SLACK_WEBHOOK_URL: 'https://hooks.slack.test/webhook',
    SMTP_HOST: 'smtp.test.com',
    SMTP_PORT: 587,
    SMTP_USER: 'test@test.com',
    SMTP_PASS: 'test-password',
    WEBHOOK_BASE_URL: 'http://localhost:3001',
    FRONTEND_URL: 'http://localhost:5173',
  };

  return {
    get: jest.fn((key: string) => configValues[key]),
    getOrThrow: jest.fn((key: string) => {
      if (configValues[key] === undefined) {
        throw new Error(`Configuration key "${key}" does not exist`);
      }
      return configValues[key];
    }),
  };
}

/**
 * Creates a mock JwtService
 */
export function mockJwtService() {
  return {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
    verify: jest.fn().mockReturnValue({ sub: 'test-user-id', email: 'test@example.com' }),
    verifyAsync: jest.fn().mockResolvedValue({ sub: 'test-user-id', email: 'test@example.com' }),
    decode: jest.fn().mockReturnValue({ sub: 'test-user-id', email: 'test@example.com' }),
  };
}

/**
 * Creates a mock Bull Queue
 */
export function mockQueue() {
  return {
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    process: jest.fn(),
    on: jest.fn(),
    getJob: jest.fn().mockResolvedValue(null),
    getJobs: jest.fn().mockResolvedValue([]),
    removeRepeatableByKey: jest.fn().mockResolvedValue(true),
  };
}

/**
 * Creates a mock WebSocket gateway
 */
export function mockExecutionGateway() {
  return {
    emitExecutionStarted: jest.fn(),
    emitExecutionProgress: jest.fn(),
    emitNodeCompleted: jest.fn(),
    emitExecutionCompleted: jest.fn(),
  };
}

// ============================================================
// Mock Data Constants
// ============================================================

export const mockUserId = new Types.ObjectId();
export const mockWorkflowId = new Types.ObjectId();
export const mockExecutionId = new Types.ObjectId();
export const mockConnectionId = new Types.ObjectId();

/**
 * Mock user object with bcrypt-hashed password (hash of 'password123')
 */
export const mockUser = {
  _id: mockUserId,
  email: 'test@example.com',
  password: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', // hashed 'password123'
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
};

/**
 * Mock workflow object with sample nodes and edges
 */
export const mockWorkflow = {
  _id: mockWorkflowId,
  userId: mockUserId,
  name: 'Test Workflow',
  description: 'A test workflow for unit testing',
  nodes: [
    {
      id: 'node-1',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        type: 'webhook',
        label: 'Webhook Trigger',
        config: {},
      },
    },
    {
      id: 'node-2',
      type: 'action',
      position: { x: 300, y: 100 },
      data: {
        type: 'http',
        label: 'HTTP Request',
        config: {
          method: 'GET',
          url: 'https://api.example.com/data',
        },
      },
    },
    {
      id: 'node-3',
      type: 'action',
      position: { x: 500, y: 100 },
      data: {
        type: 'delay',
        label: 'Delay',
        config: {
          duration: 1000,
        },
      },
    },
  ],
  edges: [
    {
      id: 'edge-1',
      source: 'node-1',
      target: 'node-2',
    },
    {
      id: 'edge-2',
      source: 'node-2',
      target: 'node-3',
    },
  ],
  isActive: true,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
};

/**
 * Mock execution object
 */
export const mockExecution = {
  _id: mockExecutionId,
  workflowId: mockWorkflowId,
  userId: mockUserId,
  status: 'success' as const,
  triggerData: { body: { test: 'data' } },
  triggerSource: 'manual',
  logs: [
    {
      nodeId: 'node-1',
      nodeName: 'Webhook Trigger',
      status: 'success',
      startTime: new Date('2024-01-01T00:00:00.000Z'),
      endTime: new Date('2024-01-01T00:00:01.000Z'),
      duration: 1000,
      output: { received: true },
    },
    {
      nodeId: 'node-2',
      nodeName: 'HTTP Request',
      status: 'success',
      startTime: new Date('2024-01-01T00:00:01.000Z'),
      endTime: new Date('2024-01-01T00:00:02.000Z'),
      duration: 1000,
      output: { data: 'response' },
    },
  ],
  startTime: new Date('2024-01-01T00:00:00.000Z'),
  endTime: new Date('2024-01-01T00:00:02.000Z'),
  duration: 2000,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
};

/**
 * Mock connection object with encrypted tokens
 */
export const mockConnection = {
  _id: mockConnectionId,
  userId: mockUserId,
  service: 'slack' as const,
  accessToken: 'U2FsdGVkX1+encrypted-access-token', // mock encrypted token
  refreshToken: 'U2FsdGVkX1+encrypted-refresh-token',
  expiresAt: new Date('2025-01-01T00:00:00.000Z'),
  scopes: ['chat:write', 'channels:read'],
  metadata: {
    teamId: 'T12345',
    teamName: 'Test Team',
    botUserId: 'U12345',
  },
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
};

/**
 * Mock execution context for node handlers
 */
export const mockExecutionContext = {
  executionId: mockExecutionId.toString(),
  workflowId: mockWorkflowId.toString(),
  userId: mockUserId.toString(),
  variables: {},
  nodeOutputs: {},
  triggerData: { body: {}, headers: {}, query: {} },
};

/**
 * Creates a mock Mongoose Model constructor
 */
export function createMockModel(mockData: any = null) {
  const mockModel = jest.fn().mockImplementation((dto) => ({
    ...dto,
    _id: new Types.ObjectId(),
    save: jest.fn().mockResolvedValue({ ...dto, _id: new Types.ObjectId() }),
  }));

  Object.assign(mockModel, {
    find: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockData ? [mockData] : []),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
    }),
    findOne: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockData),
    }),
    findById: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockData),
    }),
    findByIdAndUpdate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockData),
    }),
    findByIdAndDelete: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockData),
    }),
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    countDocuments: jest.fn().mockResolvedValue(mockData ? 1 : 0),
    create: jest.fn().mockResolvedValue(mockData || { _id: new Types.ObjectId() }),
  });

  return mockModel;
}
