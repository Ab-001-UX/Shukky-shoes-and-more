describe('Admin Portal Flow', () => {
  const mockAdminUser = {
    id: 'admin-1',
    name: 'Shukky Admin',
    email: 'admin@shukkyshoes.com',
    role: 'ADMIN'
  }

  const mockOrders = [
    {
      id: 'order-101',
      createdAt: '2026-06-09T08:00:00Z',
      totalAmount: 2400000, // ₦24,000.00
      paymentStatus: 'SUCCESS',
      flutterwaveTxRef: 'flw-ref-101',
      deliveryDetails: {
        fullName: 'Jane Doe',
        phone: '08099998877',
        address: '15 Admiralty Way, Lekki',
        city: 'Lagos',
        state: 'Lagos',
        notes: 'Deliver after 5 PM'
      },
      items: [
        {
          id: 'item-101',
          price: 2400000,
          quantity: 1,
          product: {
            name: 'Luxury Suede Heels'
          }
        }
      ]
    }
  ]

  const mockProducts = [
    {
      id: 'prod-1',
      name: 'Luxury Leather Loafers',
      price: 1200000,
      stock: 5,
      category: 'SHOES',
      status: 'ACTIVE',
      images: ['https://example.com/loafers.jpg'],
      description: 'Handcrafted premium leather loafers'
    },
    {
      id: 'prod-2',
      name: 'Classic Leather Bag',
      price: 3500000,
      stock: 3,
      category: 'BAGS',
      status: 'ACTIVE',
      images: ['https://example.com/bag.jpg'],
      description: 'Elegant calfskin leather shoulder bag'
    }
  ]

  const mockPolicies = {
    delivery: 'Delivery takes 1-3 business days within Lagos, and 3-5 days outside Lagos.',
    returns: 'Returns are accepted within 7 days of delivery in original condition.'
  }

  beforeEach(() => {
    // Intercept default checkout/me route to clear sessions by default
    cy.intercept('GET', '/api/auth/me', {
      statusCode: 401,
      body: { success: false, message: 'Unauthenticated' }
    }).as('checkAuth')

    cy.intercept('POST', '/api/auth/login', {
      success: true,
      data: mockAdminUser
    }).as('loginApi')

    cy.intercept('GET', '/api/admin/orders', {
      success: true,
      data: mockOrders
    }).as('getAdminOrders')

    cy.intercept('GET', '/api/admin/inventory', {
      success: true,
      data: mockProducts
    }).as('getAdminInventory')

    cy.intercept('GET', '/api/policies', {
      success: true,
      data: mockPolicies
    }).as('getPolicies')
  })

  it('redirects unauthenticated users to the welcome page', () => {
    cy.visit('/admin/dashboard')
    cy.wait('@checkAuth')
    cy.url().should('include', '/welcome')
  })

  it('allows an admin to log in and access dashboard metrics', () => {
    // Override /auth/me for this test after successful login
    cy.intercept('GET', '/api/auth/me', {
      success: true,
      data: mockAdminUser
    }).as('checkAuthAdmin')

    // Visit login
    cy.visit('/login')
    cy.get('#email').type('admin@shukkyshoes.com')
    cy.get('#password').type('AdminPassword123')
    cy.get('button[type="submit"]').click()

    cy.wait('@loginApi')
    cy.url().should('include', '/admin/dashboard')
    
    // Check dashboard stubs are loading
    cy.wait('@getAdminOrders')
    cy.contains('Admin Dashboard').should('be.visible')
    cy.contains('₦24,000.00').should('be.visible') // summary check
  })

  it('allows admin to manage inventory and view products', () => {
    // Login session hydration
    cy.intercept('GET', '/api/auth/me', {
      success: true,
      data: mockAdminUser
    })

    cy.visit('/admin/products')
    cy.wait('@getAdminInventory')
    
    cy.contains('Luxury Leather Loafers').should('be.visible')
    cy.contains('Classic Leather Bag').should('be.visible')
  })

  it('allows admin to view policies', () => {
    cy.intercept('GET', '/api/auth/me', {
      success: true,
      data: mockAdminUser
    })

    cy.visit('/admin/policies')
    cy.wait('@getPolicies')
    cy.contains('Delivery Policy').should('be.visible')
    cy.contains('Return Policy').should('be.visible')
  })
})
