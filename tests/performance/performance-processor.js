const fs = require('fs');
const path = require('path');

// Performance metrics collection
const metrics = {
  recommendationTimes: [],
  itineraryTimes: [],
  locationContentTimes: [],
  errors: []
};

function logPerformanceMetric(requestParams, response, context, ee, next) {
  const startTime = Date.now();
  
  // Store start time in context
  context.vars.startTime = startTime;
  
  return next();
}

function recordResponseTime(requestParams, response, context, ee, next) {
  const endTime = Date.now();
  const responseTime = endTime - context.vars.startTime;
  
  // Categorize by endpoint
  const url = requestParams.url || '';
  
  if (url.includes('/recommendations')) {
    metrics.recommendationTimes.push(responseTime);
    
    // Assert performance requirements
    if (responseTime > 3000) { // 3 second threshold
      metrics.errors.push({
        type: 'SLOW_RECOMMENDATION',
        responseTime,
        threshold: 3000,
        url
      });
    }
  } else if (url.includes('/itinerary/generate')) {
    metrics.itineraryTimes.push(responseTime);
    
    // Assert performance requirements
    if (responseTime > 5000) { // 5 second threshold for complex itinerary generation
      metrics.errors.push({
        type: 'SLOW_ITINERARY',
        responseTime,
        threshold: 5000,
        url
      });
    }
  } else if (url.includes('/location/contextual')) {
    metrics.locationContentTimes.push(responseTime);
    
    // Assert performance requirements
    if (responseTime > 1000) { // 1 second threshold for location content
      metrics.errors.push({
        type: 'SLOW_LOCATION_CONTENT',
        responseTime,
        threshold: 1000,
        url
      });
    }
  }
  
  return next();
}

function generatePerformanceReport(context, ee, next) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalRequests: metrics.recommendationTimes.length + metrics.itineraryTimes.length + metrics.locationContentTimes.length,
      totalErrors: metrics.errors.length
    },
    recommendations: {
      count: metrics.recommendationTimes.length,
      avgResponseTime: calculateAverage(metrics.recommendationTimes),
      p95ResponseTime: calculatePercentile(metrics.recommendationTimes, 95),
      p99ResponseTime: calculatePercentile(metrics.recommendationTimes, 99),
      maxResponseTime: Math.max(...metrics.recommendationTimes),
      minResponseTime: Math.min(...metrics.recommendationTimes)
    },
    itineraryGeneration: {
      count: metrics.itineraryTimes.length,
      avgResponseTime: calculateAverage(metrics.itineraryTimes),
      p95ResponseTime: calculatePercentile(metrics.itineraryTimes, 95),
      p99ResponseTime: calculatePercentile(metrics.itineraryTimes, 99),
      maxResponseTime: Math.max(...metrics.itineraryTimes),
      minResponseTime: Math.min(...metrics.itineraryTimes)
    },
    locationContent: {
      count: metrics.locationContentTimes.length,
      avgResponseTime: calculateAverage(metrics.locationContentTimes),
      p95ResponseTime: calculatePercentile(metrics.locationContentTimes, 95),
      p99ResponseTime: calculatePercentile(metrics.locationContentTimes, 99),
      maxResponseTime: Math.max(...metrics.locationContentTimes),
      minResponseTime: Math.min(...metrics.locationContentTimes)
    },
    errors: metrics.errors,
    performanceAssertions: {
      recommendationsUnder3s: (metrics.recommendationTimes.filter(t => t <= 3000).length / metrics.recommendationTimes.length) * 100,
      itineraryUnder5s: (metrics.itineraryTimes.filter(t => t <= 5000).length / metrics.itineraryTimes.length) * 100,
      locationContentUnder1s: (metrics.locationContentTimes.filter(t => t <= 1000).length / metrics.locationContentTimes.length) * 100
    }
  };
  
  // Write report to file
  const reportPath = path.join(__dirname, 'reports', `performance-report-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('Performance Report Generated:', reportPath);
  console.log('Summary:', report.summary);
  console.log('Performance Assertions:', report.performanceAssertions);
  
  return next();
}

function calculateAverage(numbers) {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
}

function calculatePercentile(numbers, percentile) {
  if (numbers.length === 0) return 0;
  const sorted = numbers.sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

module.exports = {
  logPerformanceMetric,
  recordResponseTime,
  generatePerformanceReport
};