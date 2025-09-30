// Accessibility testing configuration for Hong Kong Tourism Platform

const axeConfig = {
  // Core accessibility rules
  rules: {
    // WCAG 2.1 AA compliance
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'focus-management': { enabled: true },
    'aria-labels': { enabled: true },
    'heading-structure': { enabled: true },
    'landmark-roles': { enabled: true },
    'alt-text': { enabled: true },
    'form-labels': { enabled: true },
    
    // Tourism platform specific rules
    'interactive-elements': { enabled: true },
    'navigation-consistency': { enabled: true },
    'error-identification': { enabled: true },
    'language-identification': { enabled: true }
  },
  
  // Tags to include in testing
  tags: [
    'wcag2a',
    'wcag2aa',
    'wcag21aa',
    'best-practice'
  ],
  
  // Custom rules for tourism platform
  customRules: [
    {
      id: 'tourism-recommendation-accessibility',
      description: 'Recommendation items must be accessible',
      selector: '[data-testid*="recommendation"]',
      evaluate: function(node) {
        const hasAriaLabel = node.hasAttribute('aria-label');
        const hasRole = node.hasAttribute('role');
        const isFocusable = node.tabIndex >= 0 || node.hasAttribute('tabindex');
        
        return hasAriaLabel && hasRole && isFocusable;
      }
    },
    {
      id: 'tourism-location-content-accessibility',
      description: 'Location-based content must be accessible',
      selector: '[data-testid*="location-content"]',
      evaluate: function(node) {
        const hasHeading = node.querySelector('h1, h2, h3, h4, h5, h6');
        const hasAriaDescribedBy = node.hasAttribute('aria-describedby');
        
        return hasHeading && hasAriaDescribedBy;
      }
    },
    {
      id: 'tourism-multilingual-accessibility',
      description: 'Multi-language content must specify language',
      selector: '[data-testid*="translated-content"]',
      evaluate: function(node) {
        return node.hasAttribute('lang') || node.closest('[lang]');
      }
    }
  ]
};

module.exports = axeConfig;