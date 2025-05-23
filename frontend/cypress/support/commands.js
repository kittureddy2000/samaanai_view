// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// -- This is a parent command --
Cypress.Commands.add('login', (username = 'testuser', password = 'password123') => {
  cy.visit('/login')
  cy.get('input[name=username]').type(username)
  cy.get('input[name=password]').type(password)
  cy.get('button[type=submit]').click()
  cy.url().should('not.include', '/login')
})

// Helper to add a meal entry
Cypress.Commands.add('addMealEntry', (mealType, foodName, calories, protein, carbs, fat) => {
  cy.get(`[data-testid="${mealType}-add-button"]`).click()
  cy.get('input[name=food_name]').type(foodName)
  cy.get('input[name=calories]').type(calories)
  cy.get('input[name=protein]').type(protein)
  cy.get('input[name=carbs]').type(carbs)
  cy.get('input[name=fat]').type(fat)
  cy.get('button[type=submit]').click()
})

// Helper to add an exercise entry
Cypress.Commands.add('addExerciseEntry', (exerciseName, duration, caloriesBurned) => {
  cy.get('[data-testid="add-exercise-button"]').click()
  cy.get('input[name=exercise_name]').type(exerciseName)
  cy.get('input[name=duration]').type(duration)
  cy.get('input[name=calories_burned]').type(caloriesBurned)
  cy.get('button[type=submit]').click()
})

// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... }) 