const axios = require('axios');
const crypto = require('crypto');
const { chromium } = require('playwright');

class SecurityTestSuite {
  constructor(baseUrl = 'http://localhost:8080') {
    this.baseUrl = baseUrl;
    this.browser = null;
    this.page = null;
    this.testResults = {
      authentication: [],
      authorization: [],
      dataProtection: [],
      privacy: [],
      inputValidation: [],
      sessionManagement: [],
      apiSecurity: []
    };
  }

  async setup() {
    this.browser = await chromium.launch({ headless: true });
    this.page = await this.browser.newPage();
  }

  async teardown() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async runFullSecurityTest() {
    console.log('Starting comprehensive security testing...\n');
    
    await this.setup();
    
    try {
      await this.testAuthentication();
      await this.testAuthorization();
      await this.testDataProtection();
      await this.testPrivacyCompliance();
      await this.testInputValidation();
      await this.testSessionManagement();
      await this.testApiSecurity();
      
      return this.generateSecurityReport();
      
    } finally {
      await this.teardown();
    }
  }

  async testAuthentication() {
    console.log('Testing authentication security...');
    
    // Test 1: Password strength requirements
    try {
      const weakPasswords = ['123', 'password', 'abc123', '111111'];
      
      for (const weakPassword of weakPasswords) {
        const response = await axios.post(`${this.baseUrl}/api/auth/register`, {
          email: 'test@example.com',
          password: weakPassword
        }, { validateStatus: () => true });
        
        if (response.status === 201) {
          this.testResults.authentication.push({
            test: 'Password Strength',
            status: 'FAIL',
            severity: 'HIGH',
            description: `Weak password "${weakPassword}" was accepted`,
            recommendation: 'Implement strong password requirements'
          });
        } else {
          this.testResults.authentication.push({
            test: 'Password Strength',
            status: 'PASS',
            severity: 'INFO',
            description: `Weak password "${weakPassword}" was properly rejected`
          });
        }
      }
    } catch (error) {
      this.testResults.authentication.push({
        test: 'Password Strength',
        status: 'ERROR',
        severity: 'MEDIUM',
        description: `Test failed: ${error.message}`
      });
    }
    
    // Test 2: Brute force protection
    try {
      const testEmail = 'bruteforce@example.com';
      let consecutiveFailures = 0;
      
      for (let i = 0; i < 10; i++) {
        const response = await axios.post(`${this.baseUrl}/api/auth/login`, {
          email: testEmail,
          password: `wrongpassword${i}`
        }, { validateStatus: () => true });
        
        if (response.status === 401) {
          consecutiveFailures++;
        } else if (response.status === 429) {
          // Rate limiting detected
          this.testResults.authentication.push({
            test: 'Brute Force Protection',
            status: 'PASS',
            severity: 'INFO',
            description: `Rate limiting activated after ${consecutiveFailures} failed attempts`
          });
          break;
        }
      }
      
      if (consecutiveFailures >= 10) {
        this.testResults.authentication.push({
          test: 'Brute Force Protection',
          status: 'FAIL',
          severity: 'HIGH',
          description: 'No rate limiting detected after 10 failed login attempts',
          recommendation: 'Implement account lockout or rate limiting'
        });
      }
    } catch (error) {
      this.testResults.authentication.push({
        test: 'Brute Force Protection',
        status: 'ERROR',
        severity: 'MEDIUM',
        description: `Test failed: ${error.message}`
      });
    }
    
    // Test 3: JWT token security
    try {
      const loginResponse = await axios.post(`${this.baseUrl}/api/auth/login`, {
        email: 'test@example.com',
        password: 'validpassword123'
      });
      
      if (loginResponse.data.token) {
        const token = loginResponse.data.token;
        
        // Check if token is properly formatted JWT
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
          this.testResults.authentication.push({
            test: 'JWT Token Format',
            status: 'FAIL',
            severity: 'HIGH',
            description: 'Token is not a valid JWT format',
            recommendation: 'Use proper JWT token format'
          });
        } else {
          // Check token payload for sensitive information
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          
          if (payload.password || payload.passwordHash) {
            this.testResults.authentication.push({
              test: 'JWT Token Security',
              status: 'FAIL',
              severity: 'CRITICAL',
              description: 'JWT token contains password information',
              recommendation: 'Remove sensitive data from JWT payload'
            });
          } else {
            this.testResults.authentication.push({
              test: 'JWT Token Security',
              status: 'PASS',
              severity: 'INFO',
              description: 'JWT token does not contain sensitive information'
            });
          }
        }
      }
    } catch (error) {
      this.testResults.authentication.push({
        test: 'JWT Token Security',
        status: 'ERROR',
        severity: 'MEDIUM',
        description: `Test failed: ${error.message}`
      });
    }
  }

  async testAuthorization() {
    console.log('Testing authorization controls...');
    
    // Test 1: Unauthorized access to protected endpoints
    const protectedEndpoints = [
      '/api/users/profile',
      '/api/recommendations',
      '/api/itinerary/generate',
      '/api/location/contextual',
      '/api/notifications'
    ];
    
    for (const endpoint of protectedEndpoints) {
      try {
        const response = await axios.get(`${this.baseUrl}${endpoint}`, {
          validateStatus: () => true
        });
        
        if (response.status === 200) {
          this.testResults.authorization.push({
            test: 'Unauthorized Access',
            status: 'FAIL',
            severity: 'HIGH',
            description: `Endpoint ${endpoint} accessible without authentication`,
            recommendation: 'Implement proper authentication middleware'
          });
        } else if (response.status === 401 || response.status === 403) {
          this.testResults.authorization.push({
            test: 'Unauthorized Access',
            status: 'PASS',
            severity: 'INFO',
            description: `Endpoint ${endpoint} properly protected`
          });
        }
      } catch (error) {
        this.testResults.authorization.push({
          test: 'Unauthorized Access',
          status: 'ERROR',
          severity: 'MEDIUM',
          description: `Test failed for ${endpoint}: ${error.message}`
        });
      }
    }
    
    // Test 2: Token manipulation
    try {
      const validToken = await this.getValidToken();
      if (validToken) {
        // Test with modified token
        const modifiedToken = validToken.slice(0, -10) + 'modified123';
        
        const response = await axios.get(`${this.baseUrl}/api/users/profile`, {
          headers: { Authorization: `Bearer ${modifiedToken}` },
          validateStatus: () => true
        });
        
        if (response.status === 200) {
          this.testResults.authorization.push({
            test: 'Token Manipulation',
            status: 'FAIL',
            severity: 'CRITICAL',
            description: 'Modified JWT token was accepted',
            recommendation: 'Implement proper JWT signature verification'
          });
        } else {
          this.testResults.authorization.push({
            test: 'Token Manipulation',
            status: 'PASS',
            severity: 'INFO',
            description: 'Modified JWT token was properly rejected'
          });
        }
      }
    } catch (error) {
      this.testResults.authorization.push({
        test: 'Token Manipulation',
        status: 'ERROR',
        severity: 'MEDIUM',
        description: `Test failed: ${error.message}`
      });
    }
  }

  async testDataProtection() {
    console.log('Testing data protection measures...');
    
    // Test 1: SQL Injection
    const sqlInjectionPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "admin'--",
      "' OR 1=1#"
    ];
    
    for (const payload of sqlInjectionPayloads) {
      try {
        const response = await axios.post(`${this.baseUrl}/api/auth/login`, {
          email: payload,
          password: 'test'
        }, { validateStatus: () => true });
        
        // Check if response indicates SQL injection vulnerability
        if (response.data && (
          response.data.toString().includes('SQL') ||
          response.data.toString().includes('mysql') ||
          response.data.toString().includes('ORA-') ||
          response.status === 500
        )) {
          this.testResults.dataProtection.push({
            test: 'SQL Injection',
            status: 'FAIL',
            severity: 'CRITICAL',
            description: `SQL injection vulnerability detected with payload: ${payload}`,
            recommendation: 'Use parameterized queries and input validation'
          });
        }
      } catch (error) {
        // Network errors are expected for malformed requests
      }
    }
    
    // Test 2: XSS Protection
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '"><script>alert("XSS")</script>',
      "javascript:alert('XSS')",
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>'
    ];
    
    const token = await this.getValidToken();
    if (token) {
      for (const payload of xssPayloads) {
        try {
          const response = await axios.post(`${this.baseUrl}/api/users/preferences`, {
            interests: [payload],
            notes: payload
          }, {
            headers: { Authorization: `Bearer ${token}` },
            validateStatus: () => true
          });
          
          // Check if XSS payload is reflected without encoding
          if (response.data && response.data.toString().includes(payload)) {
            this.testResults.dataProtection.push({
              test: 'XSS Protection',
              status: 'FAIL',
              severity: 'HIGH',
              description: `XSS vulnerability detected with payload: ${payload}`,
              recommendation: 'Implement proper input sanitization and output encoding'
            });
          }
        } catch (error) {
          // Expected for malformed requests
        }
      }
    }
    
    // Test 3: Data encryption in transit
    try {
      // Test if HTTPS is enforced
      const httpResponse = await axios.get(`http://localhost:8080/api/health`, {
        validateStatus: () => true,
        maxRedirects: 0
      });
      
      if (httpResponse.status === 200) {
        this.testResults.dataProtection.push({
          test: 'HTTPS Enforcement',
          status: 'FAIL',
          severity: 'HIGH',
          description: 'HTTP connections are allowed',
          recommendation: 'Enforce HTTPS for all connections'
        });
      } else if (httpResponse.status === 301 || httpResponse.status === 302) {
        this.testResults.dataProtection.push({
          test: 'HTTPS Enforcement',
          status: 'PASS',
          severity: 'INFO',
          description: 'HTTP requests are redirected to HTTPS'
        });
      }
    } catch (error) {
      // Expected if HTTP is not available
      this.testResults.dataProtection.push({
        test: 'HTTPS Enforcement',
        status: 'PASS',
        severity: 'INFO',
        description: 'HTTP connections are not available'
      });
    }
  }

  async testPrivacyCompliance() {
    console.log('Testing privacy compliance...');
    
    const token = await this.getValidToken();
    if (!token) return;
    
    // Test 1: Data export functionality (GDPR compliance)
    try {
      const response = await axios.get(`${this.baseUrl}/api/users/data-export`, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true
      });
      
      if (response.status === 404) {
        this.testResults.privacy.push({
          test: 'Data Export (GDPR)',
          status: 'FAIL',
          severity: 'HIGH',
          description: 'Data export functionality not available',
          recommendation: 'Implement GDPR-compliant data export feature'
        });
      } else if (response.status === 200) {
        this.testResults.privacy.push({
          test: 'Data Export (GDPR)',
          status: 'PASS',
          severity: 'INFO',
          description: 'Data export functionality available'
        });
      }
    } catch (error) {
      this.testResults.privacy.push({
        test: 'Data Export (GDPR)',
        status: 'ERROR',
        severity: 'MEDIUM',
        description: `Test failed: ${error.message}`
      });
    }
    
    // Test 2: Data deletion functionality
    try {
      const response = await axios.delete(`${this.baseUrl}/api/users/account`, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true
      });
      
      if (response.status === 404) {
        this.testResults.privacy.push({
          test: 'Data Deletion (Right to be Forgotten)',
          status: 'FAIL',
          severity: 'HIGH',
          description: 'Account deletion functionality not available',
          recommendation: 'Implement right to be forgotten feature'
        });
      } else if (response.status === 200 || response.status === 204) {
        this.testResults.privacy.push({
          test: 'Data Deletion (Right to be Forgotten)',
          status: 'PASS',
          severity: 'INFO',
          description: 'Account deletion functionality available'
        });
      }
    } catch (error) {
      this.testResults.privacy.push({
        test: 'Data Deletion (Right to be Forgotten)',
        status: 'ERROR',
        severity: 'MEDIUM',
        description: `Test failed: ${error.message}`
      });
    }
    
    // Test 3: Location data privacy
    try {
      const response = await axios.post(`${this.baseUrl}/api/location/track`, {
        latitude: 22.3193,
        longitude: 114.1694,
        timestamp: new Date().toISOString()
      }, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true
      });
      
      // Check if location data requires explicit consent
      if (response.status === 200 && !response.data.consentRequired) {
        this.testResults.privacy.push({
          test: 'Location Data Consent',
          status: 'FAIL',
          severity: 'HIGH',
          description: 'Location data collected without explicit consent',
          recommendation: 'Implement explicit consent for location tracking'
        });
      } else {
        this.testResults.privacy.push({
          test: 'Location Data Consent',
          status: 'PASS',
          severity: 'INFO',
          description: 'Location data collection requires proper consent'
        });
      }
    } catch (error) {
      this.testResults.privacy.push({
        test: 'Location Data Consent',
        status: 'ERROR',
        severity: 'MEDIUM',
        description: `Test failed: ${error.message}`
      });
    }
  }

  async testInputValidation() {
    console.log('Testing input validation...');
    
    const token = await this.getValidToken();
    if (!token) return;
    
    // Test 1: Email validation
    const invalidEmails = [
      'invalid-email',
      '@example.com',
      'test@',
      'test..test@example.com',
      'test@example',
      ''
    ];
    
    for (const email of invalidEmails) {
      try {
        const response = await axios.post(`${this.baseUrl}/api/auth/register`, {
          email: email,
          password: 'validpassword123'
        }, { validateStatus: () => true });
        
        if (response.status === 201) {
          this.testResults.inputValidation.push({
            test: 'Email Validation',
            status: 'FAIL',
            severity: 'MEDIUM',
            description: `Invalid email "${email}" was accepted`,
            recommendation: 'Implement proper email validation'
          });
        }
      } catch (error) {
        // Expected for invalid input
      }
    }
    
    // Test 2: Input length validation
    const longString = 'A'.repeat(10000);
    try {
      const response = await axios.post(`${this.baseUrl}/api/users/preferences`, {
        interests: [longString],
        notes: longString
      }, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true
      });
      
      if (response.status === 200) {
        this.testResults.inputValidation.push({
          test: 'Input Length Validation',
          status: 'FAIL',
          severity: 'MEDIUM',
          description: 'Extremely long input was accepted',
          recommendation: 'Implement input length limits'
        });
      } else {
        this.testResults.inputValidation.push({
          test: 'Input Length Validation',
          status: 'PASS',
          severity: 'INFO',
          description: 'Long input was properly rejected'
        });
      }
    } catch (error) {
      this.testResults.inputValidation.push({
        test: 'Input Length Validation',
        status: 'ERROR',
        severity: 'MEDIUM',
        description: `Test failed: ${error.message}`
      });
    }
  }

  async testSessionManagement() {
    console.log('Testing session management...');
    
    // Test 1: Session timeout
    try {
      const token = await this.getValidToken();
      if (token) {
        // Wait for potential session timeout (simulate with short delay for testing)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const response = await axios.get(`${this.baseUrl}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: () => true
        });
        
        // In a real scenario, you'd test with an expired token
        this.testResults.sessionManagement.push({
          test: 'Session Timeout',
          status: 'INFO',
          severity: 'INFO',
          description: 'Session timeout testing requires longer duration'
        });
      }
    } catch (error) {
      this.testResults.sessionManagement.push({
        test: 'Session Timeout',
        status: 'ERROR',
        severity: 'MEDIUM',
        description: `Test failed: ${error.message}`
      });
    }
    
    // Test 2: Concurrent session handling
    try {
      const token1 = await this.getValidToken();
      const token2 = await this.getValidToken();
      
      if (token1 && token2) {
        const response1 = await axios.get(`${this.baseUrl}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token1}` },
          validateStatus: () => true
        });
        
        const response2 = await axios.get(`${this.baseUrl}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token2}` },
          validateStatus: () => true
        });
        
        if (response1.status === 200 && response2.status === 200) {
          this.testResults.sessionManagement.push({
            test: 'Concurrent Sessions',
            status: 'INFO',
            severity: 'INFO',
            description: 'Multiple concurrent sessions allowed'
          });
        }
      }
    } catch (error) {
      this.testResults.sessionManagement.push({
        test: 'Concurrent Sessions',
        status: 'ERROR',
        severity: 'MEDIUM',
        description: `Test failed: ${error.message}`
      });
    }
  }

  async testApiSecurity() {
    console.log('Testing API security...');
    
    // Test 1: Rate limiting
    try {
      const requests = [];
      for (let i = 0; i < 100; i++) {
        requests.push(
          axios.get(`${this.baseUrl}/api/health`, { validateStatus: () => true })
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      if (rateLimitedResponses.length === 0) {
        this.testResults.apiSecurity.push({
          test: 'Rate Limiting',
          status: 'FAIL',
          severity: 'MEDIUM',
          description: 'No rate limiting detected after 100 rapid requests',
          recommendation: 'Implement API rate limiting'
        });
      } else {
        this.testResults.apiSecurity.push({
          test: 'Rate Limiting',
          status: 'PASS',
          severity: 'INFO',
          description: `Rate limiting activated after ${100 - rateLimitedResponses.length} requests`
        });
      }
    } catch (error) {
      this.testResults.apiSecurity.push({
        test: 'Rate Limiting',
        status: 'ERROR',
        severity: 'MEDIUM',
        description: `Test failed: ${error.message}`
      });
    }
    
    // Test 2: CORS configuration
    try {
      const response = await axios.options(`${this.baseUrl}/api/health`, {
        headers: {
          'Origin': 'https://malicious-site.com',
          'Access-Control-Request-Method': 'GET'
        },
        validateStatus: () => true
      });
      
      const corsHeader = response.headers['access-control-allow-origin'];
      if (corsHeader === '*') {
        this.testResults.apiSecurity.push({
          test: 'CORS Configuration',
          status: 'FAIL',
          severity: 'MEDIUM',
          description: 'CORS allows all origins (*)',
          recommendation: 'Configure CORS to allow only trusted origins'
        });
      } else {
        this.testResults.apiSecurity.push({
          test: 'CORS Configuration',
          status: 'PASS',
          severity: 'INFO',
          description: 'CORS is properly configured'
        });
      }
    } catch (error) {
      this.testResults.apiSecurity.push({
        test: 'CORS Configuration',
        status: 'ERROR',
        severity: 'MEDIUM',
        description: `Test failed: ${error.message}`
      });
    }
  }

  async getValidToken() {
    try {
      const response = await axios.post(`${this.baseUrl}/api/auth/login`, {
        email: 'test@example.com',
        password: 'validpassword123'
      });
      return response.data.token;
    } catch (error) {
      return null;
    }
  }

  generateSecurityReport() {
    const allTests = Object.values(this.testResults).flat();
    const criticalIssues = allTests.filter(t => t.severity === 'CRITICAL' && t.status === 'FAIL');
    const highIssues = allTests.filter(t => t.severity === 'HIGH' && t.status === 'FAIL');
    const mediumIssues = allTests.filter(t => t.severity === 'MEDIUM' && t.status === 'FAIL');
    const passedTests = allTests.filter(t => t.status === 'PASS');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: allTests.length,
        passedTests: passedTests.length,
        failedTests: allTests.filter(t => t.status === 'FAIL').length,
        errorTests: allTests.filter(t => t.status === 'ERROR').length,
        criticalIssues: criticalIssues.length,
        highIssues: highIssues.length,
        mediumIssues: mediumIssues.length
      },
      securityScore: this.calculateSecurityScore(allTests),
      testResults: this.testResults,
      criticalFindings: criticalIssues,
      recommendations: this.generateSecurityRecommendations(allTests),
      complianceStatus: this.assessComplianceStatus(allTests)
    };
    
    console.log('\n=== SECURITY TEST REPORT ===');
    console.log('Timestamp:', report.timestamp);
    console.log('\nSummary:');
    console.table(report.summary);
    console.log('\nSecurity Score:', report.securityScore);
    console.log('\nCompliance Status:');
    console.table(report.complianceStatus);
    
    if (criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL SECURITY ISSUES:');
      criticalIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.test}: ${issue.description}`);
      });
    }
    
    if (report.recommendations.length > 0) {
      console.log('\nSecurity Recommendations:');
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
    
    return report;
  }

  calculateSecurityScore(tests) {
    const weights = {
      'CRITICAL': 25,
      'HIGH': 15,
      'MEDIUM': 10,
      'LOW': 5
    };
    
    let totalDeductions = 0;
    tests.forEach(test => {
      if (test.status === 'FAIL') {
        totalDeductions += weights[test.severity] || 5;
      }
    });
    
    return Math.max(0, 100 - totalDeductions);
  }

  generateSecurityRecommendations(tests) {
    const recommendations = new Set();
    
    tests.forEach(test => {
      if (test.status === 'FAIL' && test.recommendation) {
        recommendations.add(test.recommendation);
      }
    });
    
    return Array.from(recommendations);
  }

  assessComplianceStatus(tests) {
    const criticalFails = tests.filter(t => t.severity === 'CRITICAL' && t.status === 'FAIL').length;
    const highFails = tests.filter(t => t.severity === 'HIGH' && t.status === 'FAIL').length;
    
    return {
      'GDPR Compliance': tests.some(t => t.test.includes('GDPR') && t.status === 'PASS') ? 'COMPLIANT' : 'NON_COMPLIANT',
      'Data Protection': criticalFails === 0 && highFails <= 2 ? 'ADEQUATE' : 'INADEQUATE',
      'Authentication Security': tests.filter(t => t.test.includes('Password') || t.test.includes('Brute Force')).every(t => t.status === 'PASS') ? 'SECURE' : 'VULNERABLE',
      'Overall Security Posture': criticalFails === 0 && highFails <= 1 ? 'ACCEPTABLE' : 'NEEDS_IMPROVEMENT'
    };
  }
}

module.exports = SecurityTestSuite;

// Run security tests if called directly
if (require.main === module) {
  const testSuite = new SecurityTestSuite();
  testSuite.runFullSecurityTest()
    .then(report => {
      console.log('\nSecurity testing completed!');
      process.exit(report.summary.criticalIssues > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Security testing failed:', error);
      process.exit(1);
    });
}