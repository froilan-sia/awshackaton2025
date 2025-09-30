const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const axeConfig = require('./axe-config');

class AccessibilityTestSuite {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      violations: [],
      passes: [],
      incomplete: [],
      inapplicable: []
    };
  }

  async setup() {
    this.browser = await chromium.launch({ headless: true });
    this.page = await this.browser.newPage();
    
    // Set up accessibility testing environment
    await this.page.setViewportSize({ width: 1280, height: 720 });
    
    // Enable screen reader simulation
    await this.page.addInitScript(() => {
      // Mock screen reader APIs
      window.speechSynthesis = {
        speak: (utterance) => console.log('Screen reader:', utterance.text),
        cancel: () => {},
        pause: () => {},
        resume: () => {}
      };
    });
  }

  async teardown() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async testPageAccessibility(url, pageName) {
    console.log(`Testing accessibility for: ${pageName}`);
    
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
    
    // Run axe accessibility tests
    const axeBuilder = new AxeBuilder({ page: this.page })
      .withTags(axeConfig.tags)
      .withRules(axeConfig.rules);
    
    const results = await axeBuilder.analyze();
    
    // Store results
    this.results.violations.push(...results.violations.map(v => ({ ...v, page: pageName })));
    this.results.passes.push(...results.passes.map(p => ({ ...p, page: pageName })));
    this.results.incomplete.push(...results.incomplete.map(i => ({ ...i, page: pageName })));
    
    // Test keyboard navigation
    await this.testKeyboardNavigation(pageName);
    
    // Test screen reader compatibility
    await this.testScreenReaderCompatibility(pageName);
    
    // Test focus management
    await this.testFocusManagement(pageName);
    
    return results;
  }

  async testKeyboardNavigation(pageName) {
    console.log(`Testing keyboard navigation for: ${pageName}`);
    
    // Test tab navigation
    const focusableElements = await this.page.$$('[tabindex]:not([tabindex="-1"]), button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [contenteditable="true"]');
    
    let currentFocusIndex = -1;
    
    for (let i = 0; i < Math.min(focusableElements.length, 20); i++) {
      await this.page.keyboard.press('Tab');
      
      const focusedElement = await this.page.evaluate(() => document.activeElement);
      const focusedTestId = await this.page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      
      // Verify focus is visible
      const focusVisible = await this.page.evaluate(() => {
        const element = document.activeElement;
        const styles = window.getComputedStyle(element);
        return styles.outline !== 'none' || styles.boxShadow !== 'none' || element.classList.contains('focus-visible');
      });
      
      if (!focusVisible) {
        this.results.violations.push({
          id: 'keyboard-focus-visible',
          description: 'Focused element must have visible focus indicator',
          impact: 'serious',
          page: pageName,
          element: focusedTestId || 'unknown'
        });
      }
      
      currentFocusIndex++;
    }
    
    // Test reverse tab navigation
    for (let i = 0; i < 5; i++) {
      await this.page.keyboard.press('Shift+Tab');
      currentFocusIndex--;
    }
    
    // Test Enter and Space key activation
    const buttons = await this.page.$$('button, [role="button"]');
    if (buttons.length > 0) {
      await buttons[0].focus();
      
      // Test Enter key
      const enterResponse = await this.page.evaluate(() => {
        return new Promise(resolve => {
          const button = document.activeElement;
          let activated = false;
          
          const handler = () => {
            activated = true;
            button.removeEventListener('click', handler);
            resolve(activated);
          };
          
          button.addEventListener('click', handler);
          
          // Simulate Enter key
          const event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter' });
          button.dispatchEvent(event);
          
          setTimeout(() => resolve(activated), 100);
        });
      });
      
      if (!enterResponse) {
        this.results.violations.push({
          id: 'keyboard-activation',
          description: 'Interactive elements must be activatable with Enter key',
          impact: 'serious',
          page: pageName,
          element: 'button'
        });
      }
    }
  }

  async testScreenReaderCompatibility(pageName) {
    console.log(`Testing screen reader compatibility for: ${pageName}`);
    
    // Test ARIA labels and descriptions
    const elementsWithAriaLabel = await this.page.$$('[aria-label]');
    const elementsWithAriaDescribedBy = await this.page.$$('[aria-describedby]');
    const elementsWithAriaLabelledBy = await this.page.$$('[aria-labelledby]');
    
    // Test heading structure
    const headings = await this.page.$$('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;
    
    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
      const currentLevel = parseInt(tagName.charAt(1));
      
      if (currentLevel > previousLevel + 1) {
        this.results.violations.push({
          id: 'heading-structure',
          description: 'Heading levels should not skip levels',
          impact: 'moderate',
          page: pageName,
          element: tagName
        });
      }
      
      previousLevel = currentLevel;
    }
    
    // Test landmark roles
    const landmarks = await this.page.$$('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"], main, nav, header, footer, aside');
    
    if (landmarks.length === 0) {
      this.results.violations.push({
        id: 'landmark-roles',
        description: 'Page should have landmark roles for navigation',
        impact: 'moderate',
        page: pageName
      });
    }
    
    // Test form labels
    const inputs = await this.page.$$('input, select, textarea');
    for (const input of inputs) {
      const hasLabel = await input.evaluate(el => {
        const id = el.id;
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledBy = el.getAttribute('aria-labelledby');
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        
        return !!(ariaLabel || ariaLabelledBy || label);
      });
      
      if (!hasLabel) {
        const inputType = await input.evaluate(el => el.type || el.tagName.toLowerCase());
        this.results.violations.push({
          id: 'form-labels',
          description: 'Form inputs must have accessible labels',
          impact: 'serious',
          page: pageName,
          element: inputType
        });
      }
    }
  }

  async testFocusManagement(pageName) {
    console.log(`Testing focus management for: ${pageName}`);
    
    // Test modal focus trapping (if modals exist)
    const modals = await this.page.$$('[role="dialog"], .modal, [data-testid*="modal"]');
    
    for (const modal of modals) {
      // Open modal if it has a trigger
      const trigger = await this.page.$('[data-testid*="open-modal"], [data-testid*="show-modal"]');
      if (trigger) {
        await trigger.click();
        await this.page.waitForTimeout(500);
        
        // Test focus is trapped within modal
        const focusableInModal = await modal.$$('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])');
        
        if (focusableInModal.length > 0) {
          // Tab through all focusable elements
          for (let i = 0; i < focusableInModal.length + 2; i++) {
            await this.page.keyboard.press('Tab');
          }
          
          // Check if focus is still within modal
          const focusWithinModal = await this.page.evaluate((modalEl) => {
            return modalEl.contains(document.activeElement);
          }, modal);
          
          if (!focusWithinModal) {
            this.results.violations.push({
              id: 'focus-trap',
              description: 'Modal dialogs must trap focus within the modal',
              impact: 'serious',
              page: pageName,
              element: 'modal'
            });
          }
        }
        
        // Close modal
        const closeButton = await modal.$('[data-testid*="close"], [aria-label*="close"]');
        if (closeButton) {
          await closeButton.click();
        }
      }
    }
    
    // Test skip links
    const skipLinks = await this.page.$$('a[href^="#"], [data-testid*="skip"]');
    for (const skipLink of skipLinks) {
      await skipLink.focus();
      await this.page.keyboard.press('Enter');
      
      const targetId = await skipLink.evaluate(el => el.getAttribute('href')?.substring(1));
      if (targetId) {
        const target = await this.page.$(`#${targetId}`);
        if (target) {
          const targetFocused = await this.page.evaluate((targetEl) => {
            return document.activeElement === targetEl || targetEl.contains(document.activeElement);
          }, target);
          
          if (!targetFocused) {
            this.results.violations.push({
              id: 'skip-link-functionality',
              description: 'Skip links must move focus to target element',
              impact: 'moderate',
              page: pageName,
              element: 'skip-link'
            });
          }
        }
      }
    }
  }

  async testTourismSpecificAccessibility() {
    console.log('Testing tourism platform specific accessibility features...');
    
    // Test recommendation accessibility
    await this.page.goto('http://localhost:3000/recommendations');
    await this.page.waitForLoadState('networkidle');
    
    const recommendations = await this.page.$$('[data-testid*="recommendation"]');
    for (const rec of recommendations) {
      const hasAriaLabel = await rec.evaluate(el => el.hasAttribute('aria-label'));
      const hasRole = await rec.evaluate(el => el.hasAttribute('role'));
      const isFocusable = await rec.evaluate(el => el.tabIndex >= 0);
      
      if (!hasAriaLabel || !hasRole || !isFocusable) {
        this.results.violations.push({
          id: 'tourism-recommendation-accessibility',
          description: 'Recommendation items must be fully accessible',
          impact: 'serious',
          page: 'recommendations'
        });
      }
    }
    
    // Test location content accessibility
    await this.page.goto('http://localhost:3000/location');
    await this.page.waitForLoadState('networkidle');
    
    const locationContent = await this.page.$$('[data-testid*="location-content"]');
    for (const content of locationContent) {
      const hasHeading = await content.$('h1, h2, h3, h4, h5, h6');
      const hasAriaDescribedBy = await content.evaluate(el => el.hasAttribute('aria-describedby'));
      
      if (!hasHeading || !hasAriaDescribedBy) {
        this.results.violations.push({
          id: 'tourism-location-content-accessibility',
          description: 'Location content must have proper heading structure and descriptions',
          impact: 'moderate',
          page: 'location'
        });
      }
    }
    
    // Test multi-language accessibility
    const languageSwitcher = await this.page.$('[data-testid="language-switcher"]');
    if (languageSwitcher) {
      await languageSwitcher.click();
      await this.page.click('[data-testid="language-zh"]');
      await this.page.waitForTimeout(1000);
      
      const translatedContent = await this.page.$$('[data-testid*="translated-content"]');
      for (const content of translatedContent) {
        const hasLangAttribute = await content.evaluate(el => 
          el.hasAttribute('lang') || el.closest('[lang]')
        );
        
        if (!hasLangAttribute) {
          this.results.violations.push({
            id: 'tourism-multilingual-accessibility',
            description: 'Translated content must specify language attribute',
            impact: 'moderate',
            page: 'multi-language'
          });
        }
      }
    }
  }

  async runFullAccessibilityTest() {
    console.log('Starting comprehensive accessibility testing...\n');
    
    await this.setup();
    
    try {
      // Test main pages
      const pages = [
        { url: 'http://localhost:3000/', name: 'Home' },
        { url: 'http://localhost:3000/dashboard', name: 'Dashboard' },
        { url: 'http://localhost:3000/recommendations', name: 'Recommendations' },
        { url: 'http://localhost:3000/itinerary', name: 'Itinerary' },
        { url: 'http://localhost:3000/location', name: 'Location' },
        { url: 'http://localhost:3000/profile', name: 'Profile' }
      ];
      
      for (const page of pages) {
        await this.testPageAccessibility(page.url, page.name);
      }
      
      // Test tourism-specific accessibility features
      await this.testTourismSpecificAccessibility();
      
      return this.generateAccessibilityReport();
      
    } finally {
      await this.teardown();
    }
  }

  generateAccessibilityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalViolations: this.results.violations.length,
        criticalViolations: this.results.violations.filter(v => v.impact === 'critical').length,
        seriousViolations: this.results.violations.filter(v => v.impact === 'serious').length,
        moderateViolations: this.results.violations.filter(v => v.impact === 'moderate').length,
        minorViolations: this.results.violations.filter(v => v.impact === 'minor').length,
        totalPasses: this.results.passes.length
      },
      violations: this.results.violations,
      wcagCompliance: this.checkWCAGCompliance(),
      recommendations: this.generateRecommendations()
    };
    
    console.log('\n=== ACCESSIBILITY TEST REPORT ===');
    console.log('Timestamp:', report.timestamp);
    console.log('\nSummary:');
    console.table(report.summary);
    console.log('\nWCAG Compliance:');
    console.table(report.wcagCompliance);
    
    if (report.violations.length > 0) {
      console.log('\nViolations by Impact:');
      const violationsByImpact = {};
      report.violations.forEach(v => {
        if (!violationsByImpact[v.impact]) {
          violationsByImpact[v.impact] = [];
        }
        violationsByImpact[v.impact].push(v);
      });
      console.table(violationsByImpact);
    }
    
    return report;
  }

  checkWCAGCompliance() {
    const criticalCount = this.results.violations.filter(v => v.impact === 'critical').length;
    const seriousCount = this.results.violations.filter(v => v.impact === 'serious').length;
    
    return {
      'WCAG 2.1 AA': criticalCount === 0 && seriousCount === 0 ? 'PASS' : 'FAIL',
      'Critical Issues': criticalCount,
      'Serious Issues': seriousCount,
      'Overall Score': Math.max(0, 100 - (criticalCount * 20) - (seriousCount * 10))
    };
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.violations.some(v => v.id === 'color-contrast')) {
      recommendations.push('Improve color contrast ratios to meet WCAG AA standards');
    }
    
    if (this.results.violations.some(v => v.id === 'keyboard-navigation')) {
      recommendations.push('Ensure all interactive elements are keyboard accessible');
    }
    
    if (this.results.violations.some(v => v.id === 'form-labels')) {
      recommendations.push('Add proper labels to all form inputs');
    }
    
    if (this.results.violations.some(v => v.id === 'heading-structure')) {
      recommendations.push('Fix heading hierarchy to follow proper structure');
    }
    
    return recommendations;
  }
}

module.exports = AccessibilityTestSuite;

// Run accessibility tests if called directly
if (require.main === module) {
  const testSuite = new AccessibilityTestSuite();
  testSuite.runFullAccessibilityTest()
    .then(report => {
      console.log('\nAccessibility testing completed!');
      process.exit(report.summary.criticalViolations > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Accessibility testing failed:', error);
      process.exit(1);
    });
}