// Custom commands for Hong Kong Tourism Platform E2E testing

// Authentication commands
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/login');
  cy.get('[data-testid="email-input"]').type(email || Cypress.env('testUser.email'));
  cy.get('[data-testid="password-input"]').type(password || Cypress.env('testUser.password'));
  cy.get('[data-testid="login-button"]').click();
  cy.url().should('not.include', '/login');
  cy.window().its('localStorage.token').should('exist');
});

Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu"]').click();
  cy.get('[data-testid="logout-button"]').click();
  cy.url().should('include', '/login');
});

// Location and geolocation commands
Cypress.Commands.add('mockGeolocation', (latitude = 22.3193, longitude = 114.1694) => {
  cy.window().then((win) => {
    cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake((success) => {
      success({
        coords: {
          latitude,
          longitude,
          accuracy: 10
        }
      });
    });
  });
});

// User preferences setup
Cypress.Commands.add('setupUserPreferences', (preferences = {}) => {
  const defaultPreferences = {
    interests: ['culture', 'food', 'nature'],
    language: 'en',
    budgetRange: 'medium',
    groupType: 'couple',
    accessibilityNeeds: []
  };
  
  const userPrefs = { ...defaultPreferences, ...preferences };
  
  cy.visit('/profile/preferences');
  
  // Set interests
  userPrefs.interests.forEach(interest => {
    cy.get(`[data-testid="interest-${interest}"]`).check();
  });
  
  // Set language
  cy.get('[data-testid="language-select"]').select(userPrefs.language);
  
  // Set budget range
  cy.get(`[data-testid="budget-${userPrefs.budgetRange}"]`).check();
  
  // Set group type
  cy.get(`[data-testid="group-${userPrefs.groupType}"]`).check();
  
  cy.get('[data-testid="save-preferences"]').click();
  cy.get('[data-testid="success-message"]').should('be.visible');
});

// Itinerary testing commands
Cypress.Commands.add('generateItinerary', (duration = 1, preferences = {}) => {
  cy.visit('/itinerary/generate');
  cy.get('[data-testid="duration-input"]').clear().type(duration.toString());
  
  Object.keys(preferences).forEach(key => {
    if (preferences[key]) {
      cy.get(`[data-testid="${key}-input"]`).type(preferences[key]);
    }
  });
  
  cy.get('[data-testid="generate-button"]').click();
  cy.get('[data-testid="itinerary-results"]', { timeout: 15000 }).should('be.visible');
});

// Recommendation testing commands
Cypress.Commands.add('waitForRecommendations', () => {
  cy.get('[data-testid="recommendations-loading"]').should('not.exist');
  cy.get('[data-testid="recommendations-list"]').should('be.visible');
  cy.get('[data-testid="recommendation-item"]').should('have.length.greaterThan', 0);
});

// Accessibility testing helpers
Cypress.Commands.add('checkA11y', (context, options) => {
  cy.injectAxe();
  cy.checkA11y(context, options);
});

// Performance testing helpers
Cypress.Commands.add('measurePerformance', (actionCallback) => {
  cy.window().then((win) => {
    const startTime = win.performance.now();
    
    actionCallback();
    
    cy.then(() => {
      const endTime = win.performance.now();
      const duration = endTime - startTime;
      cy.log(`Action completed in ${duration.toFixed(2)}ms`);
      
      // Assert performance threshold (recommendations should load within 3 seconds)
      expect(duration).to.be.lessThan(3000);
    });
  });
});

// Network condition simulation
Cypress.Commands.add('simulateSlowNetwork', () => {
  cy.intercept('**', (req) => {
    req.reply((res) => {
      res.delay(2000); // 2 second delay
      res.send();
    });
  });
});

// Multi-language testing
Cypress.Commands.add('switchLanguage', (language) => {
  cy.get('[data-testid="language-switcher"]').click();
  cy.get(`[data-testid="language-${language}"]`).click();
  cy.get('html').should('have.attr', 'lang', language);
});