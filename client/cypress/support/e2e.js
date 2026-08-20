// Import custom commands for all spec files to use
import './commands'

// Prevent tests from failing on unhandled application exceptions (useful for Sentry/analytics scripts)
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  return false
})
