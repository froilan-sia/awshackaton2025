import { serviceDiscovery, ServiceInstance } from './serviceDiscovery';

export type LoadBalancingStrategy = 'round-robin' | 'least-connections' | 'weighted-response-time' | 'random';

interface LoadBalancerState {
  roundRobinCounters: Record<string, number>;
  connectionCounts: Record<string, number>;
}

class LoadBalancer {
  private state: LoadBalancerState = {
    roundRobinCounters: {},
    connectionCounts: {}
  };
  
  private strategy: LoadBalancingStrategy = 'weighted-response-time';

  constructor() {
    // Listen to service discovery events
    serviceDiscovery.on('healthChanged', (event) => {
      this.handleHealthChange(event);
    });
  }

  setStrategy(strategy: LoadBalancingStrategy): void {
    this.strategy = strategy;
    console.log(`Load balancing strategy set to: ${strategy}`);
  }

  getHealthyInstance(serviceName: string): ServiceInstance | null {
    const healthyInstances = serviceDiscovery.getHealthyInstances(serviceName);
    
    if (healthyInstances.length === 0) {
      console.warn(`No healthy instances available for service: ${serviceName}`);
      return null;
    }

    return this.selectInstance(serviceName, healthyInstances);
  }

  getFallbackInstance(serviceName: string): ServiceInstance | null {
    // Get all instances (including unhealthy ones) as fallback
    const allInstances = serviceDiscovery.getAllInstances(serviceName);
    
    if (allInstances.length === 0) {
      return null;
    }

    // Try to find the least recently failed instance
    const sortedByLastCheck = allInstances.sort((a, b) => 
      b.lastHealthCheck.getTime() - a.lastHealthCheck.getTime()
    );

    return sortedByLastCheck[0];
  }

  private selectInstance(serviceName: string, instances: ServiceInstance[]): ServiceInstance {
    switch (this.strategy) {
      case 'round-robin':
        return this.roundRobinSelection(serviceName, instances);
      
      case 'least-connections':
        return this.leastConnectionsSelection(serviceName, instances);
      
      case 'weighted-response-time':
        return this.weightedResponseTimeSelection(instances);
      
      case 'random':
        return this.randomSelection(instances);
      
      default:
        return this.roundRobinSelection(serviceName, instances);
    }
  }

  private roundRobinSelection(serviceName: string, instances: ServiceInstance[]): ServiceInstance {
    if (!this.state.roundRobinCounters[serviceName]) {
      this.state.roundRobinCounters[serviceName] = 0;
    }

    const index = this.state.roundRobinCounters[serviceName] % instances.length;
    this.state.roundRobinCounters[serviceName]++;

    return instances[index];
  }

  private leastConnectionsSelection(serviceName: string, instances: ServiceInstance[]): ServiceInstance {
    // Find instance with least connections
    let selectedInstance = instances[0];
    let minConnections = this.state.connectionCounts[selectedInstance.id] || 0;

    for (const instance of instances) {
      const connections = this.state.connectionCounts[instance.id] || 0;
      if (connections < minConnections) {
        minConnections = connections;
        selectedInstance = instance;
      }
    }

    return selectedInstance;
  }

  private weightedResponseTimeSelection(instances: ServiceInstance[]): ServiceInstance {
    // Calculate weights based on inverse response time (faster = higher weight)
    const weights = instances.map(instance => {
      const responseTime = instance.responseTime || 1000; // Default to 1000ms if no data
      return 1 / Math.max(responseTime, 1); // Avoid division by zero
    });

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    
    if (totalWeight === 0) {
      return instances[0];
    }

    // Generate random number and select based on weighted probability
    const random = Math.random() * totalWeight;
    let cumulativeWeight = 0;

    for (let i = 0; i < instances.length; i++) {
      cumulativeWeight += weights[i];
      if (random <= cumulativeWeight) {
        return instances[i];
      }
    }

    return instances[instances.length - 1];
  }

  private randomSelection(instances: ServiceInstance[]): ServiceInstance {
    const randomIndex = Math.floor(Math.random() * instances.length);
    return instances[randomIndex];
  }

  // Connection tracking methods
  incrementConnections(instanceId: string): void {
    this.state.connectionCounts[instanceId] = (this.state.connectionCounts[instanceId] || 0) + 1;
  }

  decrementConnections(instanceId: string): void {
    if (this.state.connectionCounts[instanceId]) {
      this.state.connectionCounts[instanceId]--;
      if (this.state.connectionCounts[instanceId] <= 0) {
        delete this.state.connectionCounts[instanceId];
      }
    }
  }

  private handleHealthChange(event: any): void {
    const { instance, currentHealth, previousHealth } = event;
    
    if (currentHealth === 'unhealthy' && previousHealth === 'healthy') {
      console.warn(`Instance ${instance.id} (${instance.url}) became unhealthy`);
      // Reset connection count for unhealthy instance
      delete this.state.connectionCounts[instance.id];
    } else if (currentHealth === 'healthy' && previousHealth !== 'healthy') {
      console.log(`Instance ${instance.id} (${instance.url}) became healthy`);
    }
  }

  getLoadBalancerStats(): Record<string, any> {
    const services = Object.keys(serviceDiscovery['registry'] || {});
    const stats: Record<string, any> = {};

    services.forEach(serviceName => {
      const instances = serviceDiscovery.getAllInstances(serviceName);
      const healthyInstances = serviceDiscovery.getHealthyInstances(serviceName);
      
      stats[serviceName] = {
        totalInstances: instances.length,
        healthyInstances: healthyInstances.length,
        strategy: this.strategy,
        roundRobinCounter: this.state.roundRobinCounters[serviceName] || 0,
        connectionCounts: instances.reduce((acc, instance) => {
          acc[instance.id] = this.state.connectionCounts[instance.id] || 0;
          return acc;
        }, {} as Record<string, number>)
      };
    });

    return stats;
  }

  reset(): void {
    this.state = {
      roundRobinCounters: {},
      connectionCounts: {}
    };
    console.log('Load balancer state reset');
  }
}

export const loadBalancer = new LoadBalancer();