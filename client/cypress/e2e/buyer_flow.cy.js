describe('Buyer Purchase Flow', () => {
  beforeEach(() => {
    // Mock products list API
    cy.intercept('GET', '/api/products*', {
      success: true,
      data: [
        {
          id: 'prod-1',
          name: 'Luxury Leather Loafers',
          price: 1200000, // stored in kobo: ₦12,000.00
          images: ['https://images.unsplash.com/photo-1544025162-d76694265947'],
          description: 'Premium calfskin leather loafers',
          category: 'SHOES',
          status: 'ACTIVE',
          stock: 5
        }
      ]
    }).as('getProducts')

    // Mock individual product detail API
    cy.intercept('GET', '/api/products/prod-1', {
      success: true,
      data: {
        id: 'prod-1',
        name: 'Luxury Leather Loafers',
        price: 1200000,
        images: ['https://images.unsplash.com/photo-1544025162-d76694265947'],
        description: 'Premium calfskin leather loafers',
        category: 'SHOES',
        status: 'ACTIVE',
        stock: 5
      }
    }).as('getProductDetail')

    // Mock order creation API
    cy.intercept('POST', '/api/orders', {
      success: true,
      data: {
        orderId: 'order-123',
        txRef: 'shukky-tx-ref-123'
      }
    }).as('createOrder')

    // Mock order payment verification API
    cy.intercept('GET', '/api/payment/verify/order-123*', {
      success: true,
      data: {
        id: 'order-123',
        paymentStatus: 'SUCCESS',
        totalAmount: 1200000,
        items: [
          {
            id: 'item-1',
            price: 1200000,
            quantity: 1,
            product: {
              name: 'Luxury Leather Loafers'
            }
          }
        ],
        deliveryDetails: {
          fullName: 'Monsurat Adetomiwa',
          address: '12 Balogun Street',
          phone: '08012345678',
          notes: 'Call on arrival'
        }
      }
    }).as('verifyPayment')
  })

  it('allows a buyer to shop, add to cart, and check out successfully via mocked Flutterwave', () => {
    // 1. Visit Shop and check product
    cy.visit('/shop')
    cy.wait('@getProducts')
    cy.contains('Luxury Leather Loafers').should('be.visible')

    // 2. Visit Product Detail
    cy.contains('Luxury Leather Loafers').click()
    cy.wait('@getProductDetail')
    cy.url().should('include', '/product/prod-1')
    cy.contains('Premium calfskin leather loafers').should('be.visible')

    // 3. Add item to cart
    cy.get('button').contains('Add to Cart').should('be.enabled').click()

    // 4. View Cart
    cy.visit('/cart')
    cy.contains('Luxury Leather Loafers').should('be.visible')
    cy.contains('Checkout').click()

    // 5. Checkout Details Form
    cy.url().should('include', '/checkout')

    // Stub the window.FlutterwaveCheckout function to simulate immediate success callback
    cy.window().then((win) => {
      win.FlutterwaveCheckout = (options) => {
        options.callback({
          transaction_id: 'mock-tx-flw-123',
          id: 'mock-tx-flw-123',
          status: 'successful'
        })
      }
    })

    const details = {
      fullName: 'Monsurat Adetomiwa',
      email: 'monsurat@example.com',
      phone: '08012345678',
      method: 'RIDER',
      address: '12 Balogun Street',
      city: 'Lagos',
      state: 'Lagos',
      notes: 'Please call before arrival.'
    }

    cy.fillCheckoutForm(details)
    
    // Submit the checkout form by clicking the Pay button
    cy.get('button[type="submit"]').contains('Pay ₦').click()

    cy.wait('@createOrder')
    cy.wait('@verifyPayment')

    // 6. Verification of Confirmation redirect
    cy.url().should('include', '/order-confirmation/order-123')
    cy.contains('Payment Received!').should('be.visible')
    cy.contains('Monsurat Adetomiwa').should('be.visible')
    cy.contains('12 Balogun Street').should('be.visible')
  })
})
