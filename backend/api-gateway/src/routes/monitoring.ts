import { Router, Request, Response } from 'express';
import { serviceDiscovery } from '../services/serviceDiscovery';
import { loadBalancer } from '../services/loadBalancer';
import { circuitBreakerInstance } from '../middleware/circuitBreaker';
import { serviceMonitor } from '../services/serviceMonitor';

const router = Router();

// Dashboard endpoint - returns comprehensive system overview
router.get('/dashboard', (req: Request, res: Response) => {
  try {
    const systemHealth = serviceMonitor.getSystemHealth();
    const healthSummary = serviceDiscovery.getHealthSummary();
    const circuitStatus = {}; // circuitBreakerInstance.getCircuitStatus();
    const loadBalancerStats = loadBalancer.getLoadBalancerStats();
    const systemMetrics = serviceMonitor.getSystemMetrics();

    const dashboard = {
      overview: {
        overallHealth: systemHealth.overallHealth,
        totalServices: Object.keys(healthSummary).length,
        healthyServices: Object.values(healthSummary)
          .filter((service: any) => service.healthyPercentage === 100).length,
        openCircuits: Object.values(circuitStatus)
          .filter((status: any) => status.state === 'OPEN').length,
        timestamp: new Date()
      },
      services: healthSummary,
      circuitBreakers: circuitStatus,
      loadBalancer: loadBalancerStats,
      systemMetrics: {
        cpu: systemMetrics.cpuUsage.slice(-10), // Last 10 data points
        memory: systemMetrics.memoryUsage.slice(-10),
        connections: systemMetrics.activeConnections.slice(-10)
      },
      alerts: generateAlerts(systemHealth, healthSummary, circuitStatus),
      recommendations: generateRecommendations(systemHealth, healthSummary)
    };

    res.json({
      success: true,
      data: dashboard,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DASHBOARD_ERROR',
        message: 'Failed to generate dashboard data'
      },
      timestamp: new Date()
    });
  }
});

// Real-time metrics endpoint
router.get('/metrics/realtime', (req: Request, res: Response) => {
  try {
    const allMetrics = serviceMonitor.getAllMetrics();
    const recentTimeWindow = 5 * 60 * 1000; // 5 minutes
    const cutoffTime = Date.now() - recentTimeWindow;

    // Filter to recent metrics only
    const realtimeMetrics = {
      system: {
        cpuUsage: allMetrics.system.cpuUsage.filter((m: any) => 
          new Date(m.timestamp).getTime() > cutoffTime),
        memoryUsage: allMetrics.system.memoryUsage.filter((m: any) => 
          new Date(m.timestamp).getTime() > cutoffTime),
        activeConnections: allMetrics.system.activeConnections.filter((m: any) => 
          new Date(m.timestamp).getTime() > cutoffTime)
      },
      services: {}
    };

    // Filter service metrics
    Object.entries(allMetrics.services).forEach(([serviceName, metrics]: [string, any]) => {
      realtimeMetrics.services[serviceName] = {
        requestCount: metrics.requestCount.filter((m: any) => 
          new Date(m.timestamp).getTime() > cutoffTime),
        responseTime: metrics.responseTime.filter((m: any) => 
          new Date(m.timestamp).getTime() > cutoffTime),
        errorRate: metrics.errorRate.filter((m: any) => 
          new Date(m.timestamp).getTime() > cutoffTime),
        throughput: metrics.throughput.filter((m: any) => 
          new Date(m.timestamp).getTime() > cutoffTime)
      };
    });

    res.json({
      success: true,
      data: realtimeMetrics,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'REALTIME_METRICS_ERROR',
        message: 'Failed to retrieve real-time metrics'
      },
      timestamp: new Date()
    });
  }
});

// Service topology endpoint
router.get('/topology', (req: Request, res: Response) => {
  try {
    const healthSummary = serviceDiscovery.getHealthSummary();
    const loadBalancerStats = loadBalancer.getLoadBalancerStats();

    const topology = {
      nodes: [],
      edges: [],
      metadata: {
        totalNodes: 0,
        healthyNodes: 0,
        timestamp: new Date()
      }
    };

    // Add API Gateway as root node
    topology.nodes.push({
      id: 'api-gateway',
      name: 'API Gateway',
      type: 'gateway',
      status: 'healthy',
      metadata: {
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      }
    });

    // Add service nodes
    Object.entries(healthSummary).forEach(([serviceName, summary]: [string, any]) => {
      const isHealthy = summary.healthyPercentage === 100;
      
      topology.nodes.push({
        id: serviceName,
        name: serviceName,
        type: 'service',
        status: isHealthy ? 'healthy' : 'unhealthy',
        instances: summary.total,
        healthyInstances: summary.healthy,
        metadata: {
          healthyPercentage: summary.healthyPercentage,
          instances: summary.instances,
          loadBalancer: loadBalancerStats[serviceName] || {}
        }
      });

      // Add edge from gateway to service
      topology.edges.push({
        from: 'api-gateway',
        to: serviceName,
        type: 'http',
        status: isHealthy ? 'active' : 'degraded'
      });

      if (isHealthy) {
        topology.metadata.healthyNodes++;
      }
    });

    topology.metadata.totalNodes = topology.nodes.length;

    res.json({
      success: true,
      data: topology,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'TOPOLOGY_ERROR',
        message: 'Failed to generate service topology'
      },
      timestamp: new Date()
    });
  }
});

// Performance analytics endpoint
router.get('/analytics/performance', (req: Request, res: Response) => {
  try {
    const timeWindow = parseInt(req.query.window as string) || 3600000; // 1 hour default
    const cutoffTime = Date.now() - timeWindow;
    
    const allMetrics = serviceMonitor.getAllMetrics();
    const analytics = {
      timeWindow,
      services: {},
      system: {
        avgCpuUsage: 0,
        avgMemoryUsage: 0,
        peakConnections: 0
      },
      summary: {
        totalRequests: 0,
        avgResponseTime: 0,
        errorRate: 0,
        slowestService: null,
        fastestService: null
      }
    };

    // Analyze system metrics
    const recentCpuMetrics = allMetrics.system.cpuUsage.filter((m: any) => 
      new Date(m.timestamp).getTime() > cutoffTime);
    const recentMemoryMetrics = allMetrics.system.memoryUsage.filter((m: any) => 
      new Date(m.timestamp).getTime() > cutoffTime);
    const recentConnectionMetrics = allMetrics.system.activeConnections.filter((m: any) => 
      new Date(m.timestamp).getTime() > cutoffTime);

    analytics.system.avgCpuUsage = calculateAverage(recentCpuMetrics);
    analytics.system.avgMemoryUsage = calculateAverage(recentMemoryMetrics);
    analytics.system.peakConnections = Math.max(...recentConnectionMetrics.map((m: any) => m.value), 0);

    // Analyze service metrics
    let totalRequests = 0;
    let totalResponseTime = 0;
    let totalErrors = 0;
    const servicePerformance: any[] = [];

    Object.entries(allMetrics.services).forEach(([serviceName, metrics]: [string, any]) => {
      const recentRequests = metrics.requestCount.filter((m: any) => 
        new Date(m.timestamp).getTime() > cutoffTime);
      const recentResponseTimes = metrics.responseTime.filter((m: any) => 
        new Date(m.timestamp).getTime() > cutoffTime);
      const recentErrors = metrics.errorRate.filter((m: any) => 
        new Date(m.timestamp).getTime() > cutoffTime);

      const serviceRequests = recentRequests.length;
      const avgResponseTime = calculateAverage(recentResponseTimes);
      const avgErrorRate = calculateAverage(recentErrors);

      analytics.services[serviceName] = {
        requests: serviceRequests,
        avgResponseTime,
        errorRate: avgErrorRate,
        throughput: serviceRequests / (timeWindow / 60000), // requests per minute
        p95ResponseTime: calculatePercentile(recentResponseTimes, 95),
        p99ResponseTime: calculatePercentile(recentResponseTimes, 99)
      };

      totalRequests += serviceRequests;
      totalResponseTime += avgResponseTime * serviceRequests;
      totalErrors += avgErrorRate * serviceRequests;

      servicePerformance.push({
        name: serviceName,
        avgResponseTime,
        errorRate: avgErrorRate
      });
    });

    // Calculate summary statistics
    analytics.summary.totalRequests = totalRequests;
    analytics.summary.avgResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;
    analytics.summary.errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    // Find slowest and fastest services
    if (servicePerformance.length > 0) {
      servicePerformance.sort((a, b) => b.avgResponseTime - a.avgResponseTime);
      analytics.summary.slowestService = servicePerformance[0];
      analytics.summary.fastestService = servicePerformance[servicePerformance.length - 1];
    }

    res.json({
      success: true,
      data: analytics,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to generate performance analytics'
      },
      timestamp: new Date()
    });
  }
});

// Control endpoints for circuit breakers
router.post('/circuit-breaker/:serviceName/reset', (req: Request, res: Response) => {
  try {
    const { serviceName } = req.params;
    circuitBreakerInstance.resetCircuit(serviceName);
    
    res.json({
      success: true,
      message: `Circuit breaker reset for ${serviceName}`,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CIRCUIT_BREAKER_RESET_ERROR',
        message: 'Failed to reset circuit breaker'
      },
      timestamp: new Date()
    });
  }
});

router.post('/circuit-breaker/reset-all', (req: Request, res: Response) => {
  try {
    circuitBreakerInstance.resetAllCircuits();
    
    res.json({
      success: true,
      message: 'All circuit breakers reset',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CIRCUIT_BREAKER_RESET_ALL_ERROR',
        message: 'Failed to reset all circuit breakers'
      },
      timestamp: new Date()
    });
  }
});

// Load balancer control endpoints
router.post('/load-balancer/strategy', (req: Request, res: Response) => {
  try {
    const { strategy } = req.body;
    const validStrategies = ['round-robin', 'least-connections', 'weighted-response-time', 'random'];
    
    if (!validStrategies.includes(strategy)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STRATEGY',
          message: `Invalid strategy. Must be one of: ${validStrategies.join(', ')}`
        },
        timestamp: new Date()
      });
    }
    
    loadBalancer.setStrategy(strategy);
    
    res.json({
      success: true,
      message: `Load balancing strategy set to ${strategy}`,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'LOAD_BALANCER_STRATEGY_ERROR',
        message: 'Failed to set load balancing strategy'
      },
      timestamp: new Date()
    });
  }
});

// Helper functions
function generateAlerts(systemHealth: any, healthSummary: any, circuitStatus: any): string[] {
  const alerts: string[] = [];
  
  // System health alerts
  if (systemHealth.overallHealth < 80) {
    alerts.push(`System health is degraded: ${systemHealth.overallHealth}%`);
  }
  
  // Service health alerts
  Object.entries(healthSummary).forEach(([serviceName, summary]: [string, any]) => {
    if (summary.healthyPercentage < 100) {
      alerts.push(`${serviceName}: ${summary.healthy}/${summary.total} instances healthy`);
    }
  });
  
  // Circuit breaker alerts
  Object.entries(circuitStatus).forEach(([serviceName, status]: [string, any]) => {
    if (status.state === 'OPEN') {
      alerts.push(`Circuit breaker OPEN for ${serviceName}`);
    }
  });
  
  return alerts;
}

function generateRecommendations(systemHealth: any, healthSummary: any): string[] {
  const recommendations: string[] = [];
  
  // Service scaling recommendations
  Object.entries(healthSummary).forEach(([serviceName, summary]: [string, any]) => {
    if (summary.healthyPercentage < 50) {
      recommendations.push(`Consider scaling up ${serviceName} - low healthy instance ratio`);
    }
  });
  
  // Performance recommendations
  if (systemHealth.overallHealth < 90) {
    recommendations.push('Consider investigating system performance issues');
  }
  
  return recommendations;
}

function calculateAverage(metrics: any[]): number {
  if (metrics.length === 0) return 0;
  const sum = metrics.reduce((acc, metric) => acc + metric.value, 0);
  return Math.round((sum / metrics.length) * 100) / 100;
}

function calculatePercentile(metrics: any[], percentile: number): number {
  if (metrics.length === 0) return 0;
  
  const sorted = metrics.map(m => m.value).sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

export { router as monitoringRoutes };