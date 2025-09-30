import { serviceDiscovery } from '../src/services/serviceDiscovery';
import { serviceMonitor } from '../src/services/serviceMonitor';
import { circuitBreakerInstance } from '../src/middleware/circuitBreaker';
import { loadBalancer } from '../src/services/loadBalancer';

// Global test setup
beforeAll(async () => {
  console.log('Setting up test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
  
  // Initialize services for testing
  serviceDiscovery.initialize();
  serviceMonitor.startMonitoring();
  
  console.log('Test environment setup complete');
});

// Global test teardown
afterAll(async () => {
  console.log('Tearing down test environment...');
  
  // Cleanup services
  serviceDiscovery.shutdown();
  serviceMonitor.shutdown();
  // circuitBreakerInstance.resetAllCircuits();
  loadBalancer.reset();
  
  console.log('Test environment teardown complete');
});

// Reset state between tests
beforeEach(() => {
  // Reset circuit breakers
  // circuitBreakerInstance.resetAllCircuits();
  
  // Reset load balancer state
  loadBalancer.reset();
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock external services for testing
jest.mock('node-fetch', () => {
  return jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        success: true,
        data: { status: 'healthy' }
      })
    })
  );
});

// Helper functions for tests
global.testHelpers = {
  // Wait for a condition to be true
  waitFor: async (condition: () => boolean, timeout: number = 5000): Promise<void> => {
    const start = Date.now();
    while (!condition() && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!condition()) {
      throw new Error(`Condition not met within ${timeout}ms`);
    }
  },
  
  // Create mock service instance
  createMockService: (name: string, url: string, health: 'healthy' | 'unhealthy' = 'healthy') => ({
    id: `${name}-test-${Date.now()}`,
    name,
    url,
    health,
    lastHealthCheck: new Date(),
    responseTime: 100,
    version: '1.0.0',
    metadata: {}
  }),
  
  // Simulate service failure
  simulateServiceFailure: (serviceName: string) => {
    serviceDiscovery.emit('healthChanged', {
      instance: { id: `${serviceName}-test`, name: serviceName },
      previousHealth: 'healthy',
      currentHealth: 'unhealthy'
    });
  },
  
  // Simulate service recovery
  simulateServiceRecovery: (serviceName: string) => {
    serviceDiscovery.emit('healthChanged', {
      instance: { id: `${serviceName}-test`, name: serviceName },
      previousHealth: 'unhealthy',
      currentHealth: 'healthy'
    });
  }
};

// Extend Jest matchers
expect.extend({
  toBeHealthyService(received) {
    const pass = received && 
                 received.health === 'healthy' &&
                 received.id &&
                 received.name &&
                 received.url;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a healthy service`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a healthy service`,
        pass: false,
      };
    }
  },
  
  toHaveValidMetrics(received) {
    const pass = received &&
                 received.requestCount &&
                 received.responseTime &&
                 received.errorRate &&
                 received.throughput &&
                 Array.isArray(received.requestCount) &&
                 Array.isArray(received.responseTime) &&
                 Array.isArray(received.errorRate) &&
                 Array.isArray(received.throughput);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to have valid metrics`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to have valid metrics`,
        pass: false,
      };
    }
  }
});

// Type declarations for global helpers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeHealthyService(): R;
      toHaveValidMetrics(): R;
    }
  }
  
  var testHelpers: {
    waitFor: (condition: () => boolean, timeout?: number) => Promise<void>;
    createMockService: (name: string, url: string, health?: 'healthy' | 'unhealthy') => any;
    simulateServiceFailure: (serviceName: string) => void;
    simulateServiceRecovery: (serviceName: string) => void;
  };
}