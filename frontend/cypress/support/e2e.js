// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Define the session setup for auth - replaces the deprecated Cypress.Cookies.defaults()
Cypress.Commands.add('preserveSession', () => {
  // Set up session via localStorage
  cy.window().then((win) => {
    win.localStorage.setItem('access_token', 'fake-access-token');
    win.localStorage.setItem('refresh_token', 'fake-refresh-token');
    
    // Also mock the refresh token endpoint to avoid auth issues
    cy.intercept('POST', '/api/token/refresh/', {
      statusCode: 200,
      body: {
        access: 'new-fake-access-token'
      }
    }).as('tokenRefresh');
  });
});

// Silence uncaught exceptions
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  return false
}) 