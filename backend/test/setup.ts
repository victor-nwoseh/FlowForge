/**
 * E2E Test Setup
 * Configures test environment and global utilities
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-e2e-tests';
process.env.JWT_EXPIRES_IN = '1d';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32ch';

// Increase timeout for e2e tests
jest.setTimeout(30000);

// Global test utilities
beforeAll(async () => {
  // Any global setup can go here
});

afterAll(async () => {
  // Any global cleanup can go here
});
