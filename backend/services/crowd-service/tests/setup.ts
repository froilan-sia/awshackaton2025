import { jest } from '@jest/globals';

// Mock WebSocket to avoid issues in tests
jest.mock('ws', () => ({
  WebSocketServer: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn(),
    options: { port: 3006 }
  })),
  WebSocket: {
    OPEN: 1
  }
}));

// Mock node-cron to avoid scheduling in tests
jest.mock('node-cron', () => ({
  schedule: jest.fn()
}));

// Set test environment
process.env.NODE_ENV = 'test';