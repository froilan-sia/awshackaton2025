describe('Personalization and AI Recommendation Journey', () => {
  beforeEach(() => {
    cy.mockGeolocation(22.3193, 114.1694);
    cy.login();
  });

  it('should adapt recommendations based on user behavior and preferences', () => {
    // 1. Initial preferences setup
    cy.setupUserPreferences({
      interests: ['culture', 'history'],
      budgetRange: 'high',
      groupType: 'family'
    });

    cy.visit('/dashboard');
    cy.waitForRecommendations();

    // Verify initial recommendations match preferences
    cy.get('[data-testid="recommendation-item"]')
      .should('contain', 'Museum')
      .or('contain', 'Temple')
      .or('contain', 'Cultural');

    // 2. Simulate user interactions to build behavior profile
    // Like cultural attractions
    cy.get('[data-testid="recommendation-item"]').first().within(() => {
      cy.get('[data-testid="like-button"]').click();
    });

    // View detailed information
    cy.get('[data-testid="recommendation-item"]').first().click();
    cy.get('[data-testid="view-details"]').click();
    cy.wait(3000); // Simulate time spent viewing

    // 3. Check for adapted recommendations
    cy.visit('/dashboard');
    cy.wait('@getRecommendations');
    
    // Verify recommendations have adapted
    cy.get('[data-testid="personalization-score"]').should('be.visible');
    cy.get('[data-testid="recommendation-reason"]').should('contain', 'Based on your interests');

    // 4. Test contextual adaptation
    // Change weather conditions
    cy.intercept('GET', '/api/weather/**', { 
      fixture: 'weather-rainy.json' 
    }).as('getRainyWeather');

    cy.get('[data-testid="refresh-recommendations"]').click();
    cy.wait('@getRainyWeather');

    // Verify weather-adapted recommendations
    cy.get('[data-testid="weather-adapted"]').should('be.visible');
    cy.get('[data-testid="indoor-recommendations"]').should('be.visible');

    // 5. Test crowd-based adaptation
    cy.intercept('GET', '/api/crowd/**', { 
      fixture: 'crowd-high.json' 
    }).as('getHighCrowd');

    cy.wait('@getHighCrowd');
    cy.get('[data-testid="crowd-alternatives"]').should('be.visible');
  });

  it('should provide multilingual personalized experience', () => {
    // Set up user with Chinese language preference
    cy.setupUserPreferences({ language: 'zh' });
    
    cy.visit('/dashboard');
    
    // Verify Chinese interface
    cy.get('[data-testid="welcome-message"]').should('contain', '歡迎');
    
    // Test personalized content in Chinese
    cy.waitForRecommendations();
    cy.get('[data-testid="recommendation-title"]').should('match', /[\u4e00-\u9fff]/);
    
    // Test cultural content adaptation
    cy.get('[data-testid="cultural-context"]').should('be.visible');
    cy.get('[data-testid="local-etiquette"]').should('be.visible');
  });

  it('should handle preference learning and adaptation over time', () => {
    cy.visit('/dashboard');
    
    // Simulate multiple user sessions with different behaviors
    const behaviors = [
      { action: 'like', category: 'food' },
      { action: 'dislike', category: 'shopping' },
      { action: 'view', category: 'nature', duration: 5000 },
      { action: 'share', category: 'culture' }
    ];

    behaviors.forEach((behavior, index) => {
      // Simulate user behavior
      cy.get(`[data-testid="recommendation-${behavior.category}"]`).first().within(() => {
        if (behavior.action === 'like') {
          cy.get('[data-testid="like-button"]').click();
        } else if (behavior.action === 'dislike') {
          cy.get('[data-testid="dislike-button"]').click();
        } else if (behavior.action === 'view') {
          cy.click();
          cy.wait(behavior.duration);
          cy.get('[data-testid="back-button"]').click();
        } else if (behavior.action === 'share') {
          cy.get('[data-testid="share-button"]').click();
          cy.get('[data-testid="share-confirm"]').click();
        }
      });

      // Refresh recommendations to see adaptation
      cy.get('[data-testid="refresh-recommendations"]').click();
      cy.wait(1000);
    });

    // Verify learning has occurred
    cy.get('[data-testid="recommendation-item"]').should('contain', 'food');
    cy.get('[data-testid="recommendation-item"]').should('not.contain', 'shopping');
    
    // Check preference scores
    cy.visit('/profile/insights');
    cy.get('[data-testid="preference-food"]').should('have.class', 'high-score');
    cy.get('[data-testid="preference-shopping"]').should('have.class', 'low-score');
  });
});