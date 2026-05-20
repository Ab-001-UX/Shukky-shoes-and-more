import { getFlutterwaveToken } from './flutterwaveAuth.js'

/**
 * Verifies a transaction with Flutterwave v4 API.
 * @param {string} chargeId - The ID of the charge from the webhook or frontend.
 * @returns {Promise<Object>} - The verified transaction data.
 */
export async function verifyTransaction(chargeId) {
  try {
    const token = await getFlutterwaveToken()
    const baseUrl = process.env.FLW_BASE_URL || 'https://developersandbox-api.flutterwave.com'
    
    const response = await fetch(`${baseUrl}/charges/${chargeId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || 'Failed to verify transaction')
    }

    const { data } = await response.json()
    
    // Status check: succeeded, failed, or pending
    return {
      status: data.status, // 'succeeded', 'failed', etc.
      amount: data.amount,
      currency: data.currency,
      txRef: data.reference,
      customerEmail: data.customer?.email
    }
  } catch (error) {
    console.error('[PaymentService] Verification failed:', error.message)
    throw new Error('Could not verify payment with provider')
  }
}
