import { EventEmitter } from 'events';

export interface ServiceInstance {
  id: string;
  name: string;
  url: string;
  health: 'healthy' | 'unhealthy' | 'unknown';
  lastHealthCheck: Date;
  responseTime: number;
  version: string;
  metadata: Record<string, any>;
}

export interface ServiceRegistry {
  [serviceName: string]: ServiceInstance[];
}

class ServiceDiscovery extends EventEmitter {
  private registry: ServiceRegistry = {};
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds

  initialize(): ServiceRegistry {
    console.log('Initializing service discovery...');
    
    // Register services from environment variables
    this.registerServicesFromEnv();
    
    // Start health checking
    this.startHealthChecking();
    
    return this.registry;
  }

  private registerServicesFromEnv(): void {
    const serviceConfigs = [
      {
        name: 'user-service',
        urls: (process.env.USER_SERVICE_URLS || 'http://localhost:3001').split(','),
        version: process.env.USER_SERVICE_VERSION || '1.0.0'
      },
      {
        name: 'recommendation-service',
        urls: (process.env.RECOMMENDATION_SERVICE_URLS || 'http://localhost:8000').split(','),
        version: process.env.RECOMMENDATION_SERVICE_VERSION || '1.0.0'
      },
      {
        name: 'location-service',
        urls: (process.env.LOCATION_SERVICE_URLS || 'http://localhost:3002').split(','),
        version: process.env.LOCATION_SERVICE_VERSION || '1.0.0'
      },
      {
        name: 'event-service',
        urls: (process.env.EVENT_SERVICE_URLS || 'http://localhost:3003').split(','),
        version: process.env.EVENT_SERVICE_VERSION || '1.0.0'
      },
      {
        name: 'itinerary-service',
        urls: (process.env.ITINERARY_SERVICE_URLS || 'http://localhost:3004').split(','),
        version: process.env.ITINERARY_SERVICE_VERSION || '1.0.0'
      },
      {
        name: 'notification-service',
        urls: (process.env.NOTIFICATION_SERVICE_URLS || 'http://localhost:3005').split(','),
        version: process.env.NOTIFICATION_SERVICE_VERSION || '1.0.0'
      },
      {
        name: 'weather-service',
        urls: (process.env.WEATHER_SERVICE_URLS || 'http://localhost:3006').split(','),
        version: process.env.WEATHER_SERVICE_VERSION || '1.0.0'
      },
      {
        name: 'crowd-service',
        urls: (process.env.CROWD_SERVICE_URLS || 'http://localhost:3007').split(','),
        version: process.env.CROWD_SERVICE_VERSION || '1.0.0'
      },
      {
        name: 'local-insights-service',
        urls: (process.env.LOCAL_INSIGHTS_SERVICE_URLS || 'http://localhost:3008').split(','),
        version: process.env.LOCAL_INSIGHTS_SERVICE_VERSION || '1.0.0'
      },
      {
        name: 'translation-service',
        urls: (process.env.TRANSLATION_SERVICE_URLS || 'http://localhost:3009').split(','),
        version: process.env.TRANSLATION_SERVICE_VERSION || '1.0.0'
      },
      {
        name: 'practical-tips-service',
        urls: (process.env.PRACTICAL_TIPS_SERVICE_URLS || 'http://localhost:3010').split(','),
        version: process.env.PRACTICAL_TIPS_SERVICE_VERSION || '1.0.0'
      },
      {
        name: 'sustainability-service',
        urls: (process.env.SUSTAINABILITY_SERVICE_URLS || 'http://localhost:3011').split(','),
        version: process.env.SUSTAINABILITY_SERVICE_VERSION || '1.0.0'
      },
      {
        name: 'privacy-service',
        urls: (process.env.PRIVACY_SERVICE_URLS || 'http://localhost:3012').split(','),
        version: process.env.PRIVACY_SERVICE_VERSION || '1.0.0'
      },
      {
        name: 'admin-service',
        urls: (process.env.ADMIN_SERVICE_URLS || 'http://localhost:3013').split(','),
        version: process.env.ADMIN_SERVICE_VERSION || '1.0.0'
      }
    ];

    serviceConfigs.forEach(config => {
      this.registry[config.name] = config.urls.map((url, index) => ({
        id: `${config.name}-${index}`,
        name: config.name,
        url: url.trim(),
        health: 'unknown' as const,
        lastHealthCheck: new Date(),
        responseTime: 0,
        version: config.version,
        metadata: {}
      }));
    });

    console.log(`Registered ${Object.keys(this.registry).length} services`);
  }

  private startHealthChecking(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.HEALTH_CHECK_INTERVAL);

    // Perform initial health check
    this.performHealthChecks();
  }

  private async performHealthChecks(): Promise<void> {
    const allInstances = Object.values(this.registry).flat();
    
    const healthCheckPromises = allInstances.map(instance => 
      this.checkInstanceHealth(instance)
    );

    await Promise.allSettled(healthCheckPromises);
    
    // Emit health check completed event
    this.emit('healthCheckCompleted', this.getHealthSummary());
  }

  private async checkInstanceHealth(instance: ServiceInstance): Promise<void> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.HEALTH_CHECK_TIMEOUT);

      const response = await fetch(`${instance.url}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'API-Gateway-Health-Check',
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);
      
      const responseTime = Date.now() - startTime;
      const previousHealth = instance.health;
      
      instance.health = response.ok ? 'healthy' : 'unhealthy';
      instance.responseTime = responseTime;
      instance.lastHealthCheck = new Date();

      // Emit health change event if status changed
      if (previousHealth !== instance.health) {
        this.emit('healthChanged', {
          instance,
          previousHealth,
          currentHealth: instance.health
        });
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const previousHealth = instance.health;
      
      instance.health = 'unhealthy';
      instance.responseTime = responseTime;
      instance.lastHealthCheck = new Date();

      if (previousHealth !== 'unhealthy') {
        this.emit('healthChanged', {
          instance,
          previousHealth,
          currentHealth: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  getHealthyInstances(serviceName: string): ServiceInstance[] {
    return this.registry[serviceName]?.filter(instance => 
      instance.health === 'healthy'
    ) || [];
  }

  getAllInstances(serviceName: string): ServiceInstance[] {
    return this.registry[serviceName] || [];
  }

  getHealthSummary(): Record<string, any> {
    const summary: Record<string, any> = {};
    
    Object.entries(this.registry).forEach(([serviceName, instances]) => {
      const healthy = instances.filter(i => i.health === 'healthy').length;
      const total = instances.length;
      
      summary[serviceName] = {
        healthy,
        total,
        healthyPercentage: total > 0 ? Math.round((healthy / total) * 100) : 0,
        instances: instances.map(i => ({
          id: i.id,
          url: i.url,
          health: i.health,
          responseTime: i.responseTime,
          lastHealthCheck: i.lastHealthCheck
        }))
      };
    });
    
    return summary;
  }

  registerInstance(serviceName: string, instance: Omit<ServiceInstance, 'id'>): void {
    if (!this.registry[serviceName]) {
      this.registry[serviceName] = [];
    }
    
    const newInstance: ServiceInstance = {
      ...instance,
      id: `${serviceName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    this.registry[serviceName].push(newInstance);
    
    this.emit('instanceRegistered', { serviceName, instance: newInstance });
  }

  deregisterInstance(serviceName: string, instanceId: string): void {
    if (this.registry[serviceName]) {
      this.registry[serviceName] = this.registry[serviceName].filter(
        instance => instance.id !== instanceId
      );
      
      this.emit('instanceDeregistered', { serviceName, instanceId });
    }
  }

  shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    this.removeAllListeners();
    console.log('Service discovery shutdown completed');
  }
}

export const serviceDiscovery = new ServiceDiscovery();