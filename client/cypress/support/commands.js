// Custom Cypress commands for Shukky Shoes & More E2E Tests

// Command to log in via the Login UI
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/login')
  cy.get('#email').type(email)
  cy.get('#password').type(password)
  cy.get('button[type="submit"]').click()
})

// Command to fill the Checkout form depending on delivery and pickup preferences
Cypress.Commands.add('fillCheckoutForm', (details) => {
  cy.get('#fullName').clear().type(details.fullName)
  cy.get('#email').clear().type(details.email)
  cy.get('#phone').clear().type(details.phone)
  
  if (details.method === 'RIDER') {
    cy.get('button').contains('Delivery by Rider').click()
    cy.get('input[type="checkbox"]').check()
    cy.get('#address').clear().type(details.address)
    cy.get('#city').clear().type(details.city)
    cy.get('#state').clear().type(details.state)
  } else {
    cy.get('button').contains('In-Store Pickup').click()
    if (details.paymentMethod === 'ON_DELIVERY') {
      cy.get('button').contains('Pay at the Store').click()
    }
    
    if (details.pickupPerson === 'OTHER') {
      cy.get('button').contains('Family / Friend').click()
      cy.get('input[name="pickerName"]').clear().type(details.pickerName)
      cy.get('input[name="pickerPhone"]').clear().type(details.pickerPhone)
      cy.get('select[name="pickerGender"]').select(details.pickerGender)
    } else if (details.pickupPerson === 'RIDER') {
      cy.get('button').contains('A Rider').click()
      cy.get('input[name="pickerPhone"]').clear().type(details.pickerPhone)
    }
  }

  if (details.notes) {
    cy.get('#notes').clear().type(details.notes)
  }
})
