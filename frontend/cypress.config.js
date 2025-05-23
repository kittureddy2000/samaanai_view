const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    defaultCommandTimeout: 20000,
    pageLoadTimeout: 30000,
    requestTimeout: 15000,
    responseTimeout: 15000
  },
});
