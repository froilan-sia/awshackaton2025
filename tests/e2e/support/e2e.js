// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide fetch/XHR requests from command log
const app = window.top;
if (!app.document.head.querySelector('[data-hide-command-log-request]')) {
  const style = app.document.createElement('style');
  style.innerHTML = '.command-name-request, .command-name-xhr { display: none }';
  style.setAttribute('data-hide-command-log-request', '');
  app.document.head.appendChild(style);
}

// Global error handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  return true;
});

// Set up test data before each test
beforeEach(() => {
  // Clear local storage and cookies
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Set up API interceptors for consistent testing
  cy.intercept('GET', '/api/weather/**', { fixture: 'weather.json' }).as('getWeather');
  cy.intercept('GET', '/api/events/**', { fixture: 'events.json' }).as('getEvents');
  cy.intercept('GET', '/api/recommendations/**', { fixture: 'recommendations.json' }).as('getRecommendations');
});