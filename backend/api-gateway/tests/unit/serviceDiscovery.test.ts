import { serviceDiscovery } from '../../src/services/serviceDiscovery';

describe('Service Discovery Unit Tests', () => {
  beforeEach(() => {
    // Reset service discovery state
    serviceDiscovery.shutdown();
  });

  afterEach(() => {
    serviceDiscovery.shutdown();
  });

  test('should initialize with default services', () => {
    const registry = serviceDiscovery.initialize();
    
    expect(typeof registry).toBe('object');
    expect(Object.keys(registry).length).toBeGreaterThan(0);
    
    // Check that expected services are registered
    const expectedServices = [
      'user-service',
      'recommendation-service',
      'location-service',
      'event-service'
    ];
    
    expectedServices.forEach(serviceName => {
      expect(registry).toHaveProperty(serviceName);
      expect(Array.isArray(registry[serviceName])).toBe(true);
    });
  });

  test('should provide health summary', () => {
    serviceDiscovery.initialize();
    const healthSummary = serviceDiscovery.getHealthSummary();
    
    expect(typeof healthSummary).toBe('object');
    
    Object.values(healthSummary).forEach((summary: any) => {
      expect(summary).toHaveProperty('healthy');
      expect(summary).toHaveProperty('total');
      expect(summary).toHaveProperty('healthyPercentage');
      expect(summary).toHaveProperty('instances');
      
      expect(typeof summary.healthy).toBe('number');
      expect(typeof summary.total).toBe('number');
      expect(typeof summary.healthyPercentage).toBe('number');
      expect(Array.isArray(summary.instances)).toBe(true);
    });
  });

  test('should register and deregister instances', () => {
    serviceDiscovery.initialize();
    
    const testInstance = {
      name: 'test-service',
      url: 'http://localhost:9999',
      health: 'healthy' as const,
      lastHealthCheck: new Date(),
      responseTime: 100,
      version: '1.0.0',
      metadata: {}
    };
    
    serviceDiscovery.registerInstance('test-service', testInstance);
    
    const instances = serviceDiscovery.getAllInstances('test-service');
    expect(instances.length).toBe(1);
    expect(instances[0].name).toBe('test-service');
    expect(instances[0].url).toBe('http://localhost:9999');
    
    // Deregister
    serviceDiscovery.deregisterInstance('test-service', instances[0].id);
    
    const instancesAfterDeregister = serviceDiscovery.getAllInstances('test-service');
    expect(instancesAfterDeregister.length).toBe(0);
  });

  test('should filter healthy instances', () => {
    serviceDiscovery.initialize();
    
    // Register healthy instance
    serviceDiscovery.registerInstance('test-service', {
      name: 'test-service',
      url: 'http://localhost:9999',
      health: 'healthy' as const,
      lastHealthCheck: new Date(),
      responseTime: 100,
      version: '1.0.0',
      metadata: {}
    });
    
    // Register unhealthy instance
    serviceDiscovery.registerInstance('test-service', {
      name: 'test-service',
      url: 'http://localhost:9998',
      health: 'unhealthy' as const,
      lastHealthCheck: new Date(),
      responseTime: 5000,
      version: '1.0.0',
      metadata: {}
    });
    
    const allInstances = serviceDiscovery.getAllInstances('test-service');
    const healthyInstances = serviceDiscovery.getHealthyInstances('test-service');
    
    expect(allInstances.length).toBe(2);
    expect(healthyInstances.length).toBe(1);
    expect(healthyInstances[0].health).toBe('healthy');
  });

  test('should emit health change events', (done) => {
    serviceDiscovery.initialize();
    
    serviceDiscovery.once('healthChanged', (event) => {
      expect(event).toHaveProperty('instance');
      expect(event).toHaveProperty('previousHealth');
      expect(event).toHaveProperty('currentHealth');
      done();
    });
    
    // Simulate health change
    serviceDiscovery.emit('healthChanged', {
      instance: { id: 'test-1', name: 'test-service' },
      previousHealth: 'healthy',
      currentHealth: 'unhealthy'
    });
  });
});