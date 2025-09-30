import { jest } from '@jest/globals';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3009';
process.env.API_VERSION = 'v1';