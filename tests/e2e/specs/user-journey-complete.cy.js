describe('Complete User Journey - Tourist Experience', () => {
  beforeEach(() => {
    cy.mockGeolocation(22.3193, 114.1694); // Hong Kong coordinates
  });

  it('should complete full tourist journey from registration to itinerary completion', () => {
    // 1. User Registration and Onboarding
    cy.visit('/');
    cy.get('[data-testid="get-started-button"]').click();
    
    // Registration
    cy.get('[data-testid="register-tab"]').click();
    cy.get('[data-testid="email-input"]').type('newuser@example.com');
    cy.get('[data-testid="password-input"]').type('securepassword123');
    cy.get('[data-testid="confirm-password-input"]').type('securepassword123');
    cy.get('[data-testid="register-button"]').click();
    
    // Verify registration success
    cy.url().should('include', '/onboarding');
    
    // 2. Complete Onboarding Process
    // Set travel preferences
    cy.get('[data-testid="interest-culture"]').check();
    cy.get('[data-testid="interest-food"]').check();
    cy.get('[data-testid="interest-nature"]').check();
    cy.get('[data-testid="next-button"]').click();
    
    // Set travel details
    cy.get('[data-testid="duration-input"]').type('3');
    cy.get('[data-testid="group-couple"]').check();
    cy.get('[data-testid="budget-medium"]').check();
    cy.get('[data-testid="next-button"]').click();
    
    // Set language and accessibility
    cy.get('[data-testid="language-english"]').check();
    cy.get('[data-testid="finish-onboarding"]').click();
    
    // 3. Location Permission and Setup
    cy.get('[data-testid="enable-location"]').click();
    cy.wait(1000); // Allow location to be set
    
    // 4. Generate Initial Recommendations
    cy.url().should('include', '/dashboard');
    cy.wait('@getRecommendations');
    cy.waitForRecommendations();
    
    // Verify personalized recommendations appear
    cy.get('[data-testid="recommendation-item"]').should('have.length.greaterThan', 0);
    cy.get('[data-testid="recommendation-item"]').first().should('contain', 'culture');
    
    // 5. Weather-Aware Itinerary Generation
    cy.get('[data-testid="generate-itinerary"]').click();
    cy.wait('@getWeather');
    
    // Verify weather consideration in recommendations
    cy.get('[data-testid="weather-info"]').should('be.visible');
    cy.get('[data-testid="weather-recommendations"]').should('be.visible');
    
    // Generate itinerary
    cy.generateItinerary(3, { startDate: '2024-01-15' });
    
    // 6. Explore Location-Based Content
    cy.get('[data-testid="itinerary-item"]').first().click();
    cy.get('[data-testid="location-details"]').should('be.visible');
    
    // Verify contextual content delivery
    cy.get('[data-testid="historical-info"]').should('be.visible');
    cy.get('[data-testid="practical-tips"]').should('be.visible');
    cy.get('[data-testid="local-insights"]').should('be.visible');
    
    // 7. Test Real-time Features
    // Simulate crowd alert
    cy.intercept('GET', '/api/crowd/**', { 
      fixture: 'crowd-high.json' 
    }).as('getCrowdData');
    
    cy.get('[data-testid="check-crowds"]').click();
    cy.wait('@getCrowdData');
    
    // Verify crowd management features
    cy.get('[data-testid="crowd-alert"]').should('be.visible');
    cy.get('[data-testid="alternative-suggestions"]').should('be.visible');
    
    // 8. Test Multi-language Support
    cy.switchLanguage('zh');
    cy.get('[data-testid="page-title"]').should('contain', '行程');
    
    // Switch back to English
    cy.switchLanguage('en');
    cy.get('[data-testid="page-title"]').should('contain', 'Itinerary');
    
    // 9. Test Local Insights Integration
    cy.get('[data-testid="local-insights-tab"]').click();
    cy.get('[data-testid="local-review"]').should('be.visible');
    cy.get('[data-testid="authenticity-score"]').should('be.visible');
    
    // 10. Complete Journey with Sustainability Tracking
    cy.get('[data-testid="complete-visit"]').click();
    cy.get('[data-testid="sustainability-impact"]').should('be.visible');
    cy.get('[data-testid="local-business-support"]').should('be.visible');
    
    // Verify journey completion
    cy.get('[data-testid="journey-complete"]').should('be.visible');
    cy.get('[data-testid="trip-summary"]').should('be.visible');
  });

  it('should handle offline scenarios gracefully', () => {
    cy.login();
    
    // Simulate offline condition
    cy.intercept('**', { forceNetworkError: true });
    
    cy.visit('/dashboard');
    
    // Verify offline functionality
    cy.get('[data-testid="offline-indicator"]').should('be.visible');
    cy.get('[data-testid="cached-recommendations"]').should('be.visible');
    
    // Test offline itinerary access
    cy.get('[data-testid="offline-itinerary"]').click();
    cy.get('[data-testid="cached-itinerary"]').should('be.visible');
  });

  it('should provide accessible experience for users with disabilities', () => {
    cy.login();
    cy.setupUserPreferences({ 
      accessibilityNeeds: ['screen-reader', 'high-contrast'] 
    });
    
    cy.visit('/dashboard');
    
    // Test keyboard navigation
    cy.get('body').tab();
    cy.focused().should('have.attr', 'data-testid', 'main-navigation');
    
    // Test screen reader compatibility
    cy.checkA11y();
    
    // Test high contrast mode
    cy.get('[data-testid="accessibility-menu"]').click();
    cy.get('[data-testid="high-contrast-toggle"]').click();
    cy.get('body').should('have.class', 'high-contrast');
    
    // Verify accessible recommendations
    cy.get('[data-testid="recommendation-item"]').each(($el) => {
      cy.wrap($el).should('have.attr', 'aria-label');
      cy.wrap($el).should('have.attr', 'role');
    });
  });
});