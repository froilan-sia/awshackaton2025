import { Request, Response, NextFunction } from 'express';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  expectedResponseTime: number;
}

interface CircuitBreakerStats {
  failures: number;
  successes: number;
  timeouts: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  state: CircuitState;
}

class CircuitBreaker {
  private circuits: Map<string, CircuitBreakerStats> = new Map();
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold || 5,
      recoveryTimeout: config.recoveryTimeout || 60000, // 1 minute
      monitoringPeriod: config.monitoringPeriod || 300000, // 5 minutes
      expectedResponseTime: config.expectedResponseTime || 5000 // 5 seconds
    };
  }

  private getServiceFromPath(path: string): string {
    const pathSegments = path.split('/');
    if (pathSegments.length >= 3 && pathSegments[1] === 'api') {
      return pathSegments[2];
    }
    return 'unknown';
  }

  private getCircuitKey(serviceName: string): string {
    return `circuit:${serviceName}`;
  }

  private initializeCircuit(circuitKey: string): CircuitBreakerStats {
    const stats: CircuitBreakerStats = {
      failures: 0,
      successes: 0,
      timeouts: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      state: 'CLOSED'
    };
    
    this.circuits.set(circuitKey, stats);
    return stats;
  }

  private getCircuitStats(circuitKey: string): CircuitBreakerStats {
    return this.circuits.get(circuitKey) || this.initializeCircuit(circuitKey);
  }

  private updateCircuitState(circuitKey: string, stats: CircuitBreakerStats): void {
    const now = Date.now();
    
    switch (stats.state) {
      case 'CLOSED':
        if (stats.failures >= this.config.failureThreshold) {
          stats.state = 'OPEN';
          console.warn(`Circuit breaker OPENED for ${circuitKey} - failure threshold reached`);
        }
        break;
        
      case 'OPEN':
        if (now - stats.lastFailureTime >= this.config.recoveryTimeout) {
          stats.state = 'HALF_OPEN';
          console.log(`Circuit breaker HALF_OPEN for ${circuitKey} - attempting recovery`);
        }
        break;
        
      case 'HALF_OPEN':
        if (stats.successes > 0) {
          stats.state = 'CLOSED';
          stats.failures = 0; // Reset failure count
          console.log(`Circuit breaker CLOSED for ${circuitKey} - recovery successful`);
        } else if (stats.failures > 0) {
          stats.state = 'OPEN';
          console.warn(`Circuit breaker OPEN for ${circuitKey} - recovery failed`);
        }
        break;
    }
  }

  private recordSuccess(circuitKey: string): void {
    const stats = this.getCircuitStats(circuitKey);
    stats.successes++;
    stats.lastSuccessTime = Date.now();
    
    // Reset failure count on successful requests in monitoring period
    const now = Date.now();
    if (now - stats.lastFailureTime > this.config.monitoringPeriod) {
      stats.failures = 0;
    }
    
    this.updateCircuitState(circuitKey, stats);
  }

  private recordFailure(circuitKey: string, isTimeout: boolean = false): void {
    const stats = this.getCircuitStats(circuitKey);
    stats.failures++;
    stats.lastFailureTime = Date.now();
    
    if (isTimeout) {
      stats.timeouts++;
    }
    
    this.updateCircuitState(circuitKey, stats);
  }

  private isCircuitOpen(circuitKey: string): boolean {
    const stats = this.getCircuitStats(circuitKey);
    return stats.state === 'OPEN';
  }

  middleware() {
    const self = this;
    return (req: Request, res: Response, next: NextFunction) => {
      const serviceName = this.getServiceFromPath(req.path);
      const circuitKey = self.getCircuitKey(serviceName);
      
      // Check if circuit is open
      if (self.isCircuitOpen(circuitKey)) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'CIRCUIT_BREAKER_OPEN',
            message: `Service ${serviceName} is currently unavailable due to repeated failures`,
            timestamp: new Date(),
            retryAfter: Math.ceil(self.config.recoveryTimeout / 1000)
          }
        });
      }

      // Set up response monitoring
      const startTime = Date.now();
      let responseRecorded = false;

      // Monitor response
      const originalSend = res.send;
      res.send = function(body) {
        if (!responseRecorded) {
          responseRecorded = true;
          const responseTime = Date.now() - startTime;
          
          if (res.statusCode >= 200 && res.statusCode < 400) {
            // Success
            self.recordSuccess(circuitKey);
          } else if (res.statusCode >= 500) {
            // Server error - record as failure
            self.recordFailure(circuitKey);
          }
          // 4xx errors are not considered circuit breaker failures
        }
        
        return originalSend.call(this, body);
      };

      // Set up timeout monitoring
      const timeoutId = setTimeout(() => {
        if (!responseRecorded) {
          responseRecorded = true;
          self.recordFailure(circuitKey, true);
          
          if (!res.headersSent) {
            res.status(504).json({
              success: false,
              error: {
                code: 'GATEWAY_TIMEOUT',
                message: `Request to ${serviceName} timed out`,
                timestamp: new Date()
              }
            });
          }
        }
      }, self.config.expectedResponseTime);

      // Clean up timeout on response finish
      res.on('finish', () => {
        clearTimeout(timeoutId);
      });

      next();
    };
    };
  }

  getCircuitStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    this.circuits.forEach((stats, circuitKey) => {
      const serviceName = circuitKey.replace('circuit:', '');
      status[serviceName] = {
        state: stats.state,
        failures: stats.failures,
        successes: stats.successes,
        timeouts: stats.timeouts,
        lastFailureTime: stats.lastFailureTime ? new Date(stats.lastFailureTime) : null,
        lastSuccessTime: stats.lastSuccessTime ? new Date(stats.lastSuccessTime) : null,
        failureRate: stats.failures + stats.successes > 0 
          ? (stats.failures / (stats.failures + stats.successes) * 100).toFixed(2) + '%'
          : '0%'
      };
    });
    
    return status;
  }

  resetCircuit(serviceName: string): void {
    const circuitKey = this.getCircuitKey(serviceName);
    this.circuits.delete(circuitKey);
    console.log(`Circuit breaker reset for ${serviceName}`);
  }

  resetAllCircuits(): void {
    this.circuits.clear();
    console.log('All circuit breakers reset');
  }
}

const circuitBreakerInstance = new CircuitBreaker();

export const circuitBreaker = circuitBreakerInstance.middleware();
export { circuitBreakerInstance };