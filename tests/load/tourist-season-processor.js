const fs = require('fs');
const path = require('path');

// Load testing metrics and monitoring
const loadMetrics = {
  phases: {},
  scenarios: {},
  errors: [],
  performanceThresholds: {
    recommendations: 3000,      // 3 seconds
    itineraryGeneration: 8000,  // 8 seconds
    locationContent: 1500,      // 1.5 seconds
    authentication: 2000,       // 2 seconds
    realTimeUpdates: 1000       // 1 second
  },
  currentPhase: null,
  startTime: Date.now()
};

// Track phase changes
function trackPhase(context, ee, next) {
  const phaseName = context.vars.$environment?.phase || 'unknown';
  
  if (loadMetrics.currentPhase !== phaseName) {
    loadMetrics.currentPhase = phaseName;
    
    if (!loadMetrics.phases[phaseName]) {
      loadMetrics.phases[phaseName] = {
        startTime: Date.now(),
        requests: 0,
        errors: 0,
        responseTimes: [],
        throughput: 0
      };
    }
    
    console.log(`Phase changed to: ${phaseName}`);
  }
  
  return next();
}

// Monitor request performance
function monitorRequest(requestParams, response, context, ee, next) {
  const startTime = Date.now();
  context.vars._requestStartTime = startTime;
  
  // Track scenario
  const scenarioName = context.scenario?.name || 'unknown';
  if (!loadMetrics.scenarios[scenarioName]) {
    loadMetrics.scenarios[scenarioName] = {
      requests: 0,
      errors: 0,
      responseTimes: [],
      successRate: 0
    };
  }
  
  return next();
}

function recordResponse(requestParams, response, context, ee, next) {
  const endTime = Date.now();
  const responseTime = endTime - (context.vars._requestStartTime || endTime);
  const scenarioName = context.scenario?.name || 'unknown';
  const phaseName = loadMetrics.currentPhase || 'unknown';
  const url = requestParams.url || '';
  
  // Update scenario metrics
  const scenario = loadMetrics.scenarios[scenarioName];
  scenario.requests++;
  scenario.responseTimes.push(responseTime);
  
  // Update phase metrics
  if (loadMetrics.phases[phaseName]) {
    loadMetrics.phases[phaseName].requests++;
    loadMetrics.phases[phaseName].responseTimes.push(responseTime);
  }
  
  // Check response status
  const statusCode = response?.statusCode || 0;
  const isError = statusCode >= 400;
  
  if (isError) {
    scenario.errors++;
    if (loadMetrics.phases[phaseName]) {
      loadMetrics.phases[phaseName].errors++;
    }
    
    loadMetrics.errors.push({
      timestamp: new Date().toISOString(),
      scenario: scenarioName,
      phase: phaseName,
      url,
      statusCode,
      responseTime,
      error: response?.body || 'Unknown error'
    });
  }
  
  // Check performance thresholds
  checkPerformanceThresholds(url, responseTime, scenarioName, phaseName);
  
  // Update success rates
  scenario.successRate = ((scenario.requests - scenario.errors) / scenario.requests) * 100;
  
  return next();
}

function checkPerformanceThresholds(url, responseTime, scenario, phase) {
  let threshold = null;
  let endpointType = 'unknown';
  
  if (url.includes('/recommendations')) {
    threshold = loadMetrics.performanceThresholds.recommendations;
    endpointType = 'recommendations';
  } else if (url.includes('/itinerary/generate')) {
    threshold = loadMetrics.performanceThresholds.itineraryGeneration;
    endpointType = 'itineraryGeneration';
  } else if (url.includes('/location/contextual')) {
    threshold = loadMetrics.performanceThresholds.locationContent;
    endpointType = 'locationContent';
  } else if (url.includes('/auth/')) {
    threshold = loadMetrics.performanceThresholds.authentication;
    endpointType = 'authentication';
  } else if (url.includes('/notifications') || url.includes('/alerts')) {
    threshold = loadMetrics.performanceThresholds.realTimeUpdates;
    endpointType = 'realTimeUpdates';
  }
  
  if (threshold && responseTime > threshold) {
    loadMetrics.errors.push({
      timestamp: new Date().toISOString(),
      type: 'PERFORMANCE_THRESHOLD_EXCEEDED',
      scenario,
      phase,
      url,
      endpointType,
      responseTime,
      threshold,
      severity: responseTime > threshold * 2 ? 'CRITICAL' : 'WARNING'
    });
  }
}

// Generate real-time monitoring reports
function generateRealtimeReport(context, ee, next) {
  const currentTime = Date.now();
  const testDuration = (currentTime - loadMetrics.startTime) / 1000; // seconds
  
  // Calculate overall metrics
  const totalRequests = Object.values(loadMetrics.scenarios).reduce((sum, s) => sum + s.requests, 0);
  const totalErrors = Object.values(loadMetrics.scenarios).reduce((sum, s) => sum + s.errors, 0);
  const overallSuccessRate = totalRequests > 0 ? ((totalRequests - totalErrors) / totalRequests) * 100 : 0;
  const throughput = totalRequests / testDuration;
  
  // Calculate response time percentiles
  const allResponseTimes = Object.values(loadMetrics.scenarios)
    .flatMap(s => s.responseTimes)
    .sort((a, b) => a - b);
  
  const p50 = calculatePercentile(allResponseTimes, 50);
  const p95 = calculatePercentile(allResponseTimes, 95);
  const p99 = calculatePercentile(allResponseTimes, 99);
  
  const report = {
    timestamp: new Date().toISOString(),
    testDuration: Math.round(testDuration),
    currentPhase: loadMetrics.currentPhase,
    overall: {
      totalRequests,
      totalErrors,
      successRate: Math.round(overallSuccessRate * 100) / 100,
      throughput: Math.round(throughput * 100) / 100,
      avgResponseTime: Math.round(calculateAverage(allResponseTimes)),
      p50ResponseTime: Math.round(p50),
      p95ResponseTime: Math.round(p95),
      p99ResponseTime: Math.round(p99)
    },
    phases: Object.keys(loadMetrics.phases).map(phaseName => {
      const phase = loadMetrics.phases[phaseName];
      const phaseSuccessRate = phase.requests > 0 ? ((phase.requests - phase.errors) / phase.requests) * 100 : 0;
      
      return {
        name: phaseName,
        requests: phase.requests,
        errors: phase.errors,
        successRate: Math.round(phaseSuccessRate * 100) / 100,
        avgResponseTime: Math.round(calculateAverage(phase.responseTimes)),
        p95ResponseTime: Math.round(calculatePercentile(phase.responseTimes, 95))
      };
    }),
    scenarios: Object.keys(loadMetrics.scenarios).map(scenarioName => {
      const scenario = loadMetrics.scenarios[scenarioName];
      return {
        name: scenarioName,
        requests: scenario.requests,
        errors: scenario.errors,
        successRate: Math.round(scenario.successRate * 100) / 100,
        avgResponseTime: Math.round(calculateAverage(scenario.responseTimes)),
        p95ResponseTime: Math.round(calculatePercentile(scenario.responseTimes, 95))
      };
    }),
    performanceIssues: loadMetrics.errors.filter(e => e.type === 'PERFORMANCE_THRESHOLD_EXCEEDED').length,
    criticalIssues: loadMetrics.errors.filter(e => e.severity === 'CRITICAL').length,
    recentErrors: loadMetrics.errors.slice(-10) // Last 10 errors
  };
  
  // Log real-time metrics
  console.log('\n=== REAL-TIME LOAD TEST METRICS ===');
  console.log(`Phase: ${report.currentPhase} | Duration: ${report.testDuration}s`);
  console.log(`Requests: ${report.overall.totalRequests} | Errors: ${report.overall.totalErrors} | Success Rate: ${report.overall.successRate}%`);
  console.log(`Throughput: ${report.overall.throughput} req/s | Avg Response: ${report.overall.avgResponseTime}ms`);
  console.log(`P95: ${report.overall.p95ResponseTime}ms | P99: ${report.overall.p99ResponseTime}ms`);
  
  if (report.criticalIssues > 0) {
    console.log(`🚨 CRITICAL ISSUES: ${report.criticalIssues}`);
  }
  
  if (report.performanceIssues > 0) {
    console.log(`⚠️  PERFORMANCE ISSUES: ${report.performanceIssues}`);
  }
  
  // Save report to file
  const reportPath = path.join(__dirname, 'reports', `realtime-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  return next();
}

// Generate final comprehensive report
function generateFinalReport(context, ee, next) {
  const endTime = Date.now();
  const totalDuration = (endTime - loadMetrics.startTime) / 1000;
  
  const finalReport = {
    timestamp: new Date().toISOString(),
    testDuration: Math.round(totalDuration),
    summary: generateTestSummary(),
    phaseAnalysis: generatePhaseAnalysis(),
    scenarioAnalysis: generateScenarioAnalysis(),
    performanceAnalysis: generatePerformanceAnalysis(),
    errorAnalysis: generateErrorAnalysis(),
    recommendations: generateRecommendations(),
    touristSeasonReadiness: assessTouristSeasonReadiness()
  };
  
  // Save final report
  const reportPath = path.join(__dirname, 'reports', `tourist-season-load-test-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));
  
  console.log('\n=== FINAL TOURIST SEASON LOAD TEST REPORT ===');
  console.log('Report saved to:', reportPath);
  console.log('\nTest Summary:');
  console.table(finalReport.summary);
  console.log('\nTourist Season Readiness:');
  console.table(finalReport.touristSeasonReadiness);
  
  if (finalReport.recommendations.length > 0) {
    console.log('\nRecommendations:');
    finalReport.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }
  
  return next();
}

function generateTestSummary() {
  const totalRequests = Object.values(loadMetrics.scenarios).reduce((sum, s) => sum + s.requests, 0);
  const totalErrors = Object.values(loadMetrics.scenarios).reduce((sum, s) => sum + s.errors, 0);
  const allResponseTimes = Object.values(loadMetrics.scenarios).flatMap(s => s.responseTimes);
  
  return {
    totalRequests,
    totalErrors,
    successRate: totalRequests > 0 ? Math.round(((totalRequests - totalErrors) / totalRequests) * 10000) / 100 : 0,
    avgResponseTime: Math.round(calculateAverage(allResponseTimes)),
    p95ResponseTime: Math.round(calculatePercentile(allResponseTimes, 95)),
    p99ResponseTime: Math.round(calculatePercentile(allResponseTimes, 99)),
    maxResponseTime: Math.max(...allResponseTimes),
    throughput: Math.round((totalRequests / ((Date.now() - loadMetrics.startTime) / 1000)) * 100) / 100
  };
}

function assessTouristSeasonReadiness() {
  const summary = generateTestSummary();
  const performanceIssues = loadMetrics.errors.filter(e => e.type === 'PERFORMANCE_THRESHOLD_EXCEEDED').length;
  const criticalIssues = loadMetrics.errors.filter(e => e.severity === 'CRITICAL').length;
  
  return {
    overallReadiness: summary.successRate >= 99 && criticalIssues === 0 ? 'READY' : 'NEEDS_IMPROVEMENT',
    successRateGrade: summary.successRate >= 99.5 ? 'A' : summary.successRate >= 99 ? 'B' : summary.successRate >= 95 ? 'C' : 'F',
    performanceGrade: summary.p95ResponseTime <= 3000 ? 'A' : summary.p95ResponseTime <= 5000 ? 'B' : summary.p95ResponseTime <= 8000 ? 'C' : 'F',
    throughputCapacity: summary.throughput >= 100 ? 'HIGH' : summary.throughput >= 50 ? 'MEDIUM' : 'LOW',
    criticalIssues,
    performanceIssues,
    recommendedMaxLoad: Math.floor(summary.throughput * 0.8) // 80% of tested capacity
  };
}

function generateRecommendations() {
  const recommendations = [];
  const summary = generateTestSummary();
  const criticalIssues = loadMetrics.errors.filter(e => e.severity === 'CRITICAL').length;
  
  if (summary.successRate < 99) {
    recommendations.push('Improve system reliability - success rate below 99%');
  }
  
  if (summary.p95ResponseTime > 5000) {
    recommendations.push('Optimize response times - P95 exceeds 5 seconds');
  }
  
  if (criticalIssues > 0) {
    recommendations.push('Address critical performance issues before peak season');
  }
  
  if (summary.throughput < 50) {
    recommendations.push('Scale infrastructure to handle higher throughput');
  }
  
  const recommendationErrors = loadMetrics.errors.filter(e => e.url?.includes('/recommendations'));
  if (recommendationErrors.length > 0) {
    recommendations.push('Optimize recommendation engine performance');
  }
  
  const itineraryErrors = loadMetrics.errors.filter(e => e.url?.includes('/itinerary'));
  if (itineraryErrors.length > 0) {
    recommendations.push('Improve itinerary generation scalability');
  }
  
  return recommendations;
}

function generatePhaseAnalysis() {
  return Object.keys(loadMetrics.phases).map(phaseName => {
    const phase = loadMetrics.phases[phaseName];
    const successRate = phase.requests > 0 ? ((phase.requests - phase.errors) / phase.requests) * 100 : 0;
    
    return {
      phase: phaseName,
      requests: phase.requests,
      errors: phase.errors,
      successRate: Math.round(successRate * 100) / 100,
      avgResponseTime: Math.round(calculateAverage(phase.responseTimes)),
      p95ResponseTime: Math.round(calculatePercentile(phase.responseTimes, 95))
    };
  });
}

function generateScenarioAnalysis() {
  return Object.keys(loadMetrics.scenarios).map(scenarioName => {
    const scenario = loadMetrics.scenarios[scenarioName];
    
    return {
      scenario: scenarioName,
      requests: scenario.requests,
      errors: scenario.errors,
      successRate: Math.round(scenario.successRate * 100) / 100,
      avgResponseTime: Math.round(calculateAverage(scenario.responseTimes)),
      p95ResponseTime: Math.round(calculatePercentile(scenario.responseTimes, 95))
    };
  });
}

function generatePerformanceAnalysis() {
  const performanceIssues = loadMetrics.errors.filter(e => e.type === 'PERFORMANCE_THRESHOLD_EXCEEDED');
  const issuesByEndpoint = {};
  
  performanceIssues.forEach(issue => {
    if (!issuesByEndpoint[issue.endpointType]) {
      issuesByEndpoint[issue.endpointType] = [];
    }
    issuesByEndpoint[issue.endpointType].push(issue);
  });
  
  return {
    totalPerformanceIssues: performanceIssues.length,
    criticalIssues: performanceIssues.filter(i => i.severity === 'CRITICAL').length,
    issuesByEndpoint: Object.keys(issuesByEndpoint).map(endpoint => ({
      endpoint,
      count: issuesByEndpoint[endpoint].length,
      avgExcessTime: Math.round(calculateAverage(issuesByEndpoint[endpoint].map(i => i.responseTime - i.threshold)))
    }))
  };
}

function generateErrorAnalysis() {
  const errorsByType = {};
  const errorsByStatusCode = {};
  
  loadMetrics.errors.forEach(error => {
    // Group by type
    if (!errorsByType[error.type || 'HTTP_ERROR']) {
      errorsByType[error.type || 'HTTP_ERROR'] = 0;
    }
    errorsByType[error.type || 'HTTP_ERROR']++;
    
    // Group by status code
    if (error.statusCode) {
      if (!errorsByStatusCode[error.statusCode]) {
        errorsByStatusCode[error.statusCode] = 0;
      }
      errorsByStatusCode[error.statusCode]++;
    }
  });
  
  return {
    totalErrors: loadMetrics.errors.length,
    errorsByType,
    errorsByStatusCode,
    recentErrors: loadMetrics.errors.slice(-20)
  };
}

function calculateAverage(numbers) {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
}

function calculatePercentile(numbers, percentile) {
  if (numbers.length === 0) return 0;
  const sorted = numbers.sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

module.exports = {
  trackPhase,
  monitorRequest,
  recordResponse,
  generateRealtimeReport,
  generateFinalReport
};