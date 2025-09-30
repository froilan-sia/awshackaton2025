import { Router, Request, Response } from 'express';
import { ApiResponse } from '../../../shared/types';
import { serviceDiscovery } from '../services/serviceDiscovery';
import { loadBalancer } from '../services/loadBalancer';
import { circuitBreakerInstance } from '../middleware/circuitBreaker';
import { serviceMonitor } from '../services/serviceMonitor';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  services: ServiceHealth[];
  uptime: number;
  version: string;
}

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  lastCheck: Date;
}

// Simple health check for services
const checkServiceHealth = async (serviceName: string, url: string): Promise<ServiceHealth> => {
  const start = Date.now();
  
  try {
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      timeout: 5000
    });
    
    const responseTime = Date.now() - start;
    
    return {
      name: serviceName,
      status: response.ok ? 'healthy' : 'unhealthy',
      responseTime,
      lastCheck: new Date()
    };
  } catch (error) {
    return {
      name: serviceName,
      status: 'unhealthy',
      responseTime: Date.now() - start,
      lastCheck: new Date()
    };
  }
};

router.get('/', async (req: Request, res: Response) => {
  try {
    // Get comprehensive health information from service discovery
    const healthSummary = serviceDiscovery.getHealthSummary();
    const systemHealth = serviceMonitor.getSystemHealth();
    
    const allServicesHealthy = Object.values(healthSummary)
      .every((service: any) => service.healthyPercentage === 100);

    const healthStatus: HealthStatus = {
      status: allServicesHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      services: Object.entries(healthSummary).map(([name, summary]: [string, any]) => ({
        name,
        status: summary.healthyPercentage === 100 ? 'healthy' : 'unhealthy',
        responseTime: summary.instances.reduce((avg: number, instance: any) => 
          avg + (instance.responseTime || 0), 0) / summary.instances.length,
        lastCheck: new Date(Math.max(...summary.instances.map((i: any) => 
          new Date(i.lastHealthCheck).getTime())))
      })),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    };

    const response: ApiResponse<HealthStatus> = {
      success: true,
      data: healthStatus,
      timestamp: new Date()
    };

    const statusCode = allServicesHealthy ? 200 : 503;
    res.status(statusCode).json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Unable to perform health check'
      },
      timestamp: new Date()
    };
    
    res.status(500).json(response);
  }
});

// Readiness probe
router.get('/ready', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ready',
      timestamp: new Date()
    },
    timestamp: new Date()
  });
});

// Liveness probe
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'alive',
      timestamp: new Date()
    },
    timestamp: new Date()
  });
});

// Detailed system health endpoint
router.get('/detailed', (req: Request, res: Response) => {
  try {
    const systemHealth = serviceMonitor.getSystemHealth();
    const circuitStatus = {}; // circuitBreakerInstance.getCircuitStatus();
    const loadBalancerStats = loadBalancer.getLoadBalancerStats();

    const detailedHealth = {
      ...systemHealth,
      circuitBreakers: circuitStatus,
      loadBalancer: loadBalancerStats,
      gateway: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        version: process.env.npm_package_version || '1.0.0'
      }
    };

    res.status(200).json({
      success: true,
      data: detailedHealth,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DETAILED_HEALTH_CHECK_FAILED',
        message: 'Unable to retrieve detailed health information'
      },
      timestamp: new Date()
    });
  }
});

// Metrics endpoint
router.get('/metrics', (req: Request, res: Response) => {
  try {
    const allMetrics = serviceMonitor.getAllMetrics();
    
    res.status(200).json({
      success: true,
      data: allMetrics,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'METRICS_RETRIEVAL_FAILED',
        message: 'Unable to retrieve metrics'
      },
      timestamp: new Date()
    });
  }
});

// Health report endpoint
router.get('/report', (req: Request, res: Response) => {
  try {
    const healthReport = serviceMonitor.generateHealthReport();
    
    res.status(200).json({
      success: true,
      data: healthReport,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_REPORT_FAILED',
        message: 'Unable to generate health report'
      },
      timestamp: new Date()
    });
  }
});

// Service discovery status
router.get('/services', (req: Request, res: Response) => {
  try {
    const healthSummary = serviceDiscovery.getHealthSummary();
    
    res.status(200).json({
      success: true,
      data: {
        services: healthSummary,
        totalServices: Object.keys(healthSummary).length,
        healthyServices: Object.values(healthSummary)
          .filter((service: any) => service.healthyPercentage === 100).length
      },
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVICE_DISCOVERY_FAILED',
        message: 'Unable to retrieve service information'
      },
      timestamp: new Date()
    });
  }
});

export { router as healthCheck };