import { EventEmitter } from 'events';
import { serviceDiscovery } from './serviceDiscovery';
import { loadBalancer } from './loadBalancer';
import { circuitBreakerInstance } from '../middleware/circuitBreaker';

interface MetricData {
  timestamp: Date;
  value: number;
  labels?: Record<string, string>;
}

interface ServiceMetrics {
  requestCount: MetricData[];
  responseTime: MetricData[];
  errorRate: MetricData[];
  throughput: MetricData[];
}

interface SystemMetrics {
  cpuUsage: MetricData[];
  memoryUsage: MetricData[];
  activeConnections: MetricData[];
}

class ServiceMonitor extends EventEmitter {
  private metrics: Map<string, ServiceMetrics> = new Map();
  private systemMetrics: SystemMetrics = {
    cpuUsage: [],
    memoryUsage: [],
    activeConnections: []
  };
  
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly MONITORING_INTERVAL = 30000; // 30 seconds
  private readonly METRIC_RETENTION_PERIOD = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_METRIC_POINTS = 2880; // 24 hours of 30-second intervals

  startMonitoring(): void {
    console.log('Starting service monitoring...');
    
    // Listen to service discovery events
    serviceDiscovery.on('healthChanged', (event) => {
      this.recordHealthChangeEvent(event);
    });

    // Start periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.MONITORING_INTERVAL);

    // Collect initial metrics
    this.collectMetrics();
  }

  private async collectMetrics(): Promise<void> {
    try {
      // Collect system metrics
      await this.collectSystemMetrics();
      
      // Collect service metrics
      await this.collectServiceMetrics();
      
      // Clean up old metrics
      this.cleanupOldMetrics();
      
      // Emit metrics collected event
      this.emit('metricsCollected', {
        timestamp: new Date(),
        services: Array.from(this.metrics.keys()),
        systemHealth: this.getSystemHealth()
      });
      
    } catch (error) {
      console.error('Error collecting metrics:', error);
    }
  }

  private async collectSystemMetrics(): Promise<void> {
    const now = new Date();
    
    // CPU Usage (simplified - in production would use proper system monitoring)
    const cpuUsage = process.cpuUsage();
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    
    this.systemMetrics.cpuUsage.push({
      timestamp: now,
      value: cpuPercent
    });

    // Memory Usage
    const memUsage = process.memoryUsage();
    const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    this.systemMetrics.memoryUsage.push({
      timestamp: now,
      value: memPercent
    });

    // Active Connections (approximation)
    const activeConnections = Object.values(loadBalancer.getLoadBalancerStats())
      .reduce((total, service: any) => {
        return total + Object.values(service.connectionCounts || {})
          .reduce((sum: number, count: any) => sum + count, 0);
      }, 0);
    
    this.systemMetrics.activeConnections.push({
      timestamp: now,
      value: activeConnections
    });
  }

  private async collectServiceMetrics(): Promise<void> {
    const healthSummary = serviceDiscovery.getHealthSummary();
    const circuitStatus = {}; // circuitBreakerInstance.getCircuitStatus();
    const now = new Date();

    Object.entries(healthSummary).forEach(([serviceName, summary]: [string, any]) => {
      if (!this.metrics.has(serviceName)) {
        this.metrics.set(serviceName, {
          requestCount: [],
          responseTime: [],
          errorRate: [],
          throughput: []
        });
      }

      const serviceMetrics = this.metrics.get(serviceName)!;
      
      // Calculate average response time
      const avgResponseTime = summary.instances.reduce((sum: number, instance: any) => 
        sum + (instance.responseTime || 0), 0) / summary.instances.length;
      
      serviceMetrics.responseTime.push({
        timestamp: now,
        value: avgResponseTime,
        labels: { service: serviceName }
      });

      // Calculate error rate from circuit breaker data
      const circuitData = (circuitStatus as any)[serviceName];
      const errorRate = circuitData ? 
        (circuitData.failures / (circuitData.failures + circuitData.successes + 1)) * 100 : 0;
      
      serviceMetrics.errorRate.push({
        timestamp: now,
        value: errorRate,
        labels: { service: serviceName }
      });

      // Estimate throughput (requests per minute)
      const recentRequests = serviceMetrics.requestCount
        .filter(metric => now.getTime() - metric.timestamp.getTime() < 60000);
      const throughput = recentRequests.length;
      
      serviceMetrics.throughput.push({
        timestamp: now,
        value: throughput,
        labels: { service: serviceName }
      });
    });
  }

  private recordHealthChangeEvent(event: any): void {
    const { instance, currentHealth, previousHealth } = event;
    
    console.log(`Health change detected: ${instance.name} (${instance.id}) changed from ${previousHealth} to ${currentHealth}`);
    
    // Record as metric event
    this.emit('healthChange', {
      serviceName: instance.name,
      instanceId: instance.id,
      previousHealth,
      currentHealth,
      timestamp: new Date()
    });
  }

  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - this.METRIC_RETENTION_PERIOD;
    
    // Clean up system metrics
    Object.keys(this.systemMetrics).forEach(key => {
      const metricArray = this.systemMetrics[key as keyof SystemMetrics];
      const filteredMetrics = metricArray.filter(metric => 
        metric.timestamp.getTime() > cutoffTime
      );
      
      // Keep only the most recent points if we have too many
      if (filteredMetrics.length > this.MAX_METRIC_POINTS) {
        filteredMetrics.splice(0, filteredMetrics.length - this.MAX_METRIC_POINTS);
      }
      
      (this.systemMetrics[key as keyof SystemMetrics] as MetricData[]) = filteredMetrics;
    });

    // Clean up service metrics
    this.metrics.forEach((serviceMetrics, serviceName) => {
      Object.keys(serviceMetrics).forEach(metricType => {
        const metricArray = serviceMetrics[metricType as keyof ServiceMetrics];
        const filteredMetrics = metricArray.filter(metric => 
          metric.timestamp.getTime() > cutoffTime
        );
        
        if (filteredMetrics.length > this.MAX_METRIC_POINTS) {
          filteredMetrics.splice(0, filteredMetrics.length - this.MAX_METRIC_POINTS);
        }
        
        serviceMetrics[metricType as keyof ServiceMetrics] = filteredMetrics;
      });
    });
  }

  recordRequest(serviceName: string, responseTime: number, statusCode: number): void {
    if (!this.metrics.has(serviceName)) {
      this.metrics.set(serviceName, {
        requestCount: [],
        responseTime: [],
        errorRate: [],
        throughput: []
      });
    }

    const serviceMetrics = this.metrics.get(serviceName)!;
    const now = new Date();

    // Record request
    serviceMetrics.requestCount.push({
      timestamp: now,
      value: 1,
      labels: { 
        service: serviceName,
        status: statusCode.toString()
      }
    });

    // Record response time
    serviceMetrics.responseTime.push({
      timestamp: now,
      value: responseTime,
      labels: { service: serviceName }
    });
  }

  getServiceMetrics(serviceName: string): ServiceMetrics | null {
    return this.metrics.get(serviceName) || null;
  }

  getSystemMetrics(): SystemMetrics {
    return this.systemMetrics;
  }

  getAllMetrics(): Record<string, any> {
    const allMetrics: Record<string, any> = {
      system: this.systemMetrics,
      services: {}
    };

    this.metrics.forEach((metrics, serviceName) => {
      allMetrics.services[serviceName] = metrics;
    });

    return allMetrics;
  }

  getSystemHealth(): Record<string, any> {
    const healthSummary = serviceDiscovery.getHealthSummary();
    const circuitStatus = {}; // circuitBreakerInstance.getCircuitStatus();
    const loadBalancerStats = loadBalancer.getLoadBalancerStats();

    // Calculate overall system health score
    const totalServices = Object.keys(healthSummary).length;
    const healthyServices = Object.values(healthSummary)
      .filter((service: any) => service.healthyPercentage === 100).length;
    
    const systemHealthScore = totalServices > 0 ? 
      Math.round((healthyServices / totalServices) * 100) : 100;

    return {
      overallHealth: systemHealthScore,
      timestamp: new Date(),
      services: healthSummary,
      circuitBreakers: circuitStatus,
      loadBalancer: loadBalancerStats,
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    };
  }

  generateHealthReport(): Record<string, any> {
    const systemHealth = this.getSystemHealth();
    const recentMetrics = this.getRecentMetrics(300000); // Last 5 minutes
    
    return {
      reportTimestamp: new Date(),
      systemHealth,
      recentMetrics,
      alerts: this.generateAlerts(),
      recommendations: this.generateRecommendations()
    };
  }

  private getRecentMetrics(timeWindow: number): Record<string, any> {
    const cutoffTime = Date.now() - timeWindow;
    const recentMetrics: Record<string, any> = {};

    this.metrics.forEach((metrics, serviceName) => {
      recentMetrics[serviceName] = {
        avgResponseTime: this.calculateAverage(
          metrics.responseTime.filter(m => m.timestamp.getTime() > cutoffTime)
        ),
        errorRate: this.calculateAverage(
          metrics.errorRate.filter(m => m.timestamp.getTime() > cutoffTime)
        ),
        throughput: this.calculateSum(
          metrics.throughput.filter(m => m.timestamp.getTime() > cutoffTime)
        )
      };
    });

    return recentMetrics;
  }

  private calculateAverage(metrics: MetricData[]): number {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, metric) => acc + metric.value, 0);
    return Math.round((sum / metrics.length) * 100) / 100;
  }

  private calculateSum(metrics: MetricData[]): number {
    return metrics.reduce((acc, metric) => acc + metric.value, 0);
  }

  private generateAlerts(): string[] {
    const alerts: string[] = [];
    const healthSummary = serviceDiscovery.getHealthSummary();
    const circuitStatus = {}; // circuitBreakerInstance.getCircuitStatus();

    // Check for unhealthy services
    Object.entries(healthSummary).forEach(([serviceName, summary]: [string, any]) => {
      if (summary.healthyPercentage < 100) {
        alerts.push(`Service ${serviceName} has ${summary.healthy}/${summary.total} healthy instances`);
      }
    });

    // Check for open circuit breakers
    Object.entries(circuitStatus).forEach(([serviceName, status]: [string, any]) => {
      if (status.state === 'OPEN') {
        alerts.push(`Circuit breaker is OPEN for ${serviceName}`);
      }
    });

    // Check system metrics
    const recentMemory = this.systemMetrics.memoryUsage.slice(-5);
    const avgMemory = this.calculateAverage(recentMemory);
    if (avgMemory > 80) {
      alerts.push(`High memory usage: ${avgMemory.toFixed(1)}%`);
    }

    return alerts;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const healthSummary = serviceDiscovery.getHealthSummary();
    
    // Analyze service health patterns
    Object.entries(healthSummary).forEach(([serviceName, summary]: [string, any]) => {
      if (summary.healthyPercentage < 50) {
        recommendations.push(`Consider scaling up ${serviceName} - only ${summary.healthyPercentage}% instances healthy`);
      }
    });

    // Analyze response times
    this.metrics.forEach((metrics, serviceName) => {
      const recentResponseTimes = metrics.responseTime.slice(-10);
      const avgResponseTime = this.calculateAverage(recentResponseTimes);
      
      if (avgResponseTime > 5000) {
        recommendations.push(`${serviceName} has high response times (${avgResponseTime.toFixed(0)}ms) - consider optimization`);
      }
    });

    return recommendations;
  }

  shutdown(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.removeAllListeners();
    console.log('Service monitoring shutdown completed');
  }
}

export const serviceMonitor = new ServiceMonitor();