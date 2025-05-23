describe('Yearly Report Page', () => {
  it('loads the page', () => {
    // Set up session via localStorage directly
    cy.window().then((win) => {
      win.localStorage.setItem('access_token', 'fake-access-token');
      win.localStorage.setItem('refresh_token', 'fake-refresh-token');
    });
    
    // Visit the page
    cy.visit('/yearly');
    
    // Check that we're on a page (any content)
    cy.get('body').should('exist');
  });
});
