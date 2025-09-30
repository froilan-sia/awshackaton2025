const axios = require('axios');
const { performance } = require('perf_hooks');

class RecommendationBenchmark {
  constructor(baseUrl = 'http://localhost:8080') {
    this.baseUrl = baseUrl;
    this.authToken = null;
    this.results = {
      basicRecommendations: [],
      personalizedRecommendations: [],
      contextualRecommendations: [],
      multiLanguageRecommendations: []
    };
  }

  async authenticate() {
    try {
      const response = await axios.post(`${this.baseUrl}/api/auth/login`, {
        email: 'test@example.com',
        password: 'testpassword123'
      });
      this.authToken = response.data.token;
      return true;
    } catch (error) {
      console.error('Authentication failed:', error.message);
      return false;
    }
  }

  async benchmarkBasicRecommendations(iterations = 100) {
    console.log(`Running basic recommendations benchmark (${iterations} iterations)...`);
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      try {
        const response = await axios.get(`${this.baseUrl}/api/recommendations`, {
          headers: { Authorization: `Bearer ${this.authToken}` }
        });
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        this.results.basicRecommendations.push({
          iteration: i + 1,
          responseTime,
          success: true,
          recommendationCount: response.data.recommendations?.length || 0
        });
        
        // Assert performance requirement: < 3 seconds
        if (responseTime > 3000) {
          console.warn(`Slow response detected: ${responseTime.toFixed(2)}ms (iteration ${i + 1})`);
        }
        
      } catch (error) {
        const endTime = performance.now();
        this.results.basicRecommendations.push({
          iteration: i + 1,
          responseTime: endTime - startTime,
          success: false,
          error: error.message
        });
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async benchmarkPersonalizedRecommendations(iterations = 50) {
    console.log(`Running personalized recommendations benchmark (${iterations} iterations)...`);
    
    const userProfiles = [
      { interests: ['culture', 'history'], budget: 'high', groupType: 'couple' },
      { interests: ['food', 'shopping'], budget: 'medium', groupType: 'family' },
      { interests: ['nature', 'adventure'], budget: 'low', groupType: 'solo' },
      { interests: ['nightlife', 'entertainment'], budget: 'high', groupType: 'friends' }
    ];
    
    for (let i = 0; i < iterations; i++) {
      const profile = userProfiles[i % userProfiles.length];
      const startTime = performance.now();
      
      try {
        const response = await axios.post(`${this.baseUrl}/api/recommendations/personalized`, profile, {
          headers: { Authorization: `Bearer ${this.authToken}` }
        });
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        this.results.personalizedRecommendations.push({
          iteration: i + 1,
          responseTime,
          success: true,
          profile,
          recommendationCount: response.data.recommendations?.length || 0,
          personalizationScore: response.data.personalizationScore || 0
        });
        
        // Assert performance requirement: < 5 seconds for personalized
        if (responseTime > 5000) {
          console.warn(`Slow personalized response: ${responseTime.toFixed(2)}ms (iteration ${i + 1})`);
        }
        
      } catch (error) {
        const endTime = performance.now();
        this.results.personalizedRecommendations.push({
          iteration: i + 1,
          responseTime: endTime - startTime,
          success: false,
          profile,
          error: error.message
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  async benchmarkContextualRecommendations(iterations = 30) {
    console.log(`Running contextual recommendations benchmark (${iterations} iterations)...`);
    
    const contexts = [
      { weather: 'sunny', temperature: 25, location: { lat: 22.3193, lng: 114.1694 } },
      { weather: 'rainy', temperature: 20, location: { lat: 22.2783, lng: 114.1747 } },
      { weather: 'cloudy', temperature: 22, location: { lat: 22.3964, lng: 114.1095 } }
    ];
    
    for (let i = 0; i < iterations; i++) {
      const context = contexts[i % contexts.length];
      const startTime = performance.now();
      
      try {
        const response = await axios.post(`${this.baseUrl}/api/recommendations/contextual`, context, {
          headers: { Authorization: `Bearer ${this.authToken}` }
        });
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        this.results.contextualRecommendations.push({
          iteration: i + 1,
          responseTime,
          success: true,
          context,
          recommendationCount: response.data.recommendations?.length || 0,
          contextualAdaptations: response.data.adaptations?.length || 0
        });
        
        // Assert performance requirement: < 4 seconds for contextual
        if (responseTime > 4000) {
          console.warn(`Slow contextual response: ${responseTime.toFixed(2)}ms (iteration ${i + 1})`);
        }
        
      } catch (error) {
        const endTime = performance.now();
        this.results.contextualRecommendations.push({
          iteration: i + 1,
          responseTime: endTime - startTime,
          success: false,
          context,
          error: error.message
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  async benchmarkMultiLanguageRecommendations(iterations = 25) {
    console.log(`Running multi-language recommendations benchmark (${iterations} iterations)...`);
    
    const languages = ['en', 'zh-HK', 'zh-CN', 'ja', 'ko'];
    
    for (let i = 0; i < iterations; i++) {
      const language = languages[i % languages.length];
      const startTime = performance.now();
      
      try {
        const response = await axios.get(`${this.baseUrl}/api/recommendations`, {
          headers: { 
            Authorization: `Bearer ${this.authToken}`,
            'Accept-Language': language
          }
        });
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        this.results.multiLanguageRecommendations.push({
          iteration: i + 1,
          responseTime,
          success: true,
          language,
          recommendationCount: response.data.recommendations?.length || 0,
          translatedContent: response.data.recommendations?.every(r => r.language === language) || false
        });
        
        // Assert performance requirement: < 3.5 seconds for translation
        if (responseTime > 3500) {
          console.warn(`Slow translation response: ${responseTime.toFixed(2)}ms (iteration ${i + 1}, ${language})`);
        }
        
      } catch (error) {
        const endTime = performance.now();
        this.results.multiLanguageRecommendations.push({
          iteration: i + 1,
          responseTime: endTime - startTime,
          success: false,
          language,
          error: error.message
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.calculateSummary(),
      detailed: this.results,
      performanceAssertions: this.checkPerformanceAssertions()
    };
    
    console.log('\n=== RECOMMENDATION PERFORMANCE BENCHMARK REPORT ===');
    console.log('Timestamp:', report.timestamp);
    console.log('\nSummary:');
    console.table(report.summary);
    console.log('\nPerformance Assertions:');
    console.table(report.performanceAssertions);
    
    return report;
  }

  calculateSummary() {
    const summary = {};
    
    Object.keys(this.results).forEach(testType => {
      const results = this.results[testType];
      const successfulResults = results.filter(r => r.success);
      const responseTimes = successfulResults.map(r => r.responseTime);
      
      summary[testType] = {
        totalRequests: results.length,
        successfulRequests: successfulResults.length,
        failedRequests: results.length - successfulResults.length,
        avgResponseTime: this.calculateAverage(responseTimes).toFixed(2) + 'ms',
        p95ResponseTime: this.calculatePercentile(responseTimes, 95).toFixed(2) + 'ms',
        p99ResponseTime: this.calculatePercentile(responseTimes, 99).toFixed(2) + 'ms',
        maxResponseTime: Math.max(...responseTimes).toFixed(2) + 'ms',
        minResponseTime: Math.min(...responseTimes).toFixed(2) + 'ms'
      };
    });
    
    return summary;
  }

  checkPerformanceAssertions() {
    const assertions = {};
    
    // Basic recommendations: < 3s
    const basicSuccess = this.results.basicRecommendations.filter(r => r.success && r.responseTime <= 3000);
    assertions.basicRecommendationsUnder3s = {
      percentage: ((basicSuccess.length / this.results.basicRecommendations.length) * 100).toFixed(1) + '%',
      passed: basicSuccess.length / this.results.basicRecommendations.length >= 0.95 // 95% should pass
    };
    
    // Personalized recommendations: < 5s
    const personalizedSuccess = this.results.personalizedRecommendations.filter(r => r.success && r.responseTime <= 5000);
    assertions.personalizedRecommendationsUnder5s = {
      percentage: ((personalizedSuccess.length / this.results.personalizedRecommendations.length) * 100).toFixed(1) + '%',
      passed: personalizedSuccess.length / this.results.personalizedRecommendations.length >= 0.90 // 90% should pass
    };
    
    // Contextual recommendations: < 4s
    const contextualSuccess = this.results.contextualRecommendations.filter(r => r.success && r.responseTime <= 4000);
    assertions.contextualRecommendationsUnder4s = {
      percentage: ((contextualSuccess.length / this.results.contextualRecommendations.length) * 100).toFixed(1) + '%',
      passed: contextualSuccess.length / this.results.contextualRecommendations.length >= 0.85 // 85% should pass
    };
    
    // Multi-language recommendations: < 3.5s
    const multiLangSuccess = this.results.multiLanguageRecommendations.filter(r => r.success && r.responseTime <= 3500);
    assertions.multiLanguageRecommendationsUnder3_5s = {
      percentage: ((multiLangSuccess.length / this.results.multiLanguageRecommendations.length) * 100).toFixed(1) + '%',
      passed: multiLangSuccess.length / this.results.multiLanguageRecommendations.length >= 0.90 // 90% should pass
    };
    
    return assertions;
  }

  calculateAverage(numbers) {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  calculatePercentile(numbers, percentile) {
    if (numbers.length === 0) return 0;
    const sorted = numbers.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  async runFullBenchmark() {
    console.log('Starting Recommendation Performance Benchmark...\n');
    
    if (!(await this.authenticate())) {
      throw new Error('Failed to authenticate');
    }
    
    await this.benchmarkBasicRecommendations();
    await this.benchmarkPersonalizedRecommendations();
    await this.benchmarkContextualRecommendations();
    await this.benchmarkMultiLanguageRecommendations();
    
    return this.generateReport();
  }
}

// Export for use in other tests
module.exports = RecommendationBenchmark;

// Run benchmark if called directly
if (require.main === module) {
  const benchmark = new RecommendationBenchmark();
  benchmark.runFullBenchmark()
    .then(report => {
      console.log('\nBenchmark completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Benchmark failed:', error);
      process.exit(1);
    });
}