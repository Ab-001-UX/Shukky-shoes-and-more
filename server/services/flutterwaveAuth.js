const TOKEN_URL = 'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token'

let cachedToken = null
let tokenExpiry = null

/**
 * Fetches an OAuth 2.0 access token for Flutterwave v4 API.
 * Caches the token until it expires.
 */
export async function getFlutterwaveToken() {
  const clientId = process.env.FLW_CLIENT_ID
  const clientSecret = process.env.FLW_CLIENT_SECRET
  
  if (!clientId || !clientSecret) {
    throw new Error('Flutterwave v4 credentials (CLIENT_ID/CLIENT_SECRET) are missing in .env')
  }

  // Use cached token if still valid (minus 1 min buffer)
  if (cachedToken && tokenExpiry && Date.now() < (tokenExpiry - 60000)) {
    return cachedToken
  }

  try {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials'
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error_description || 'Failed to fetch access token')
    }

    const data = await response.json()
    const { access_token, expires_in } = data
    
    cachedToken = access_token
    tokenExpiry = Date.now() + (expires_in * 1000)
    
    return cachedToken
  } catch (error) {
    console.error('[FlutterwaveAuth] Failed to get access token:', error.message)
    throw new Error('Authentication with payment provider failed')
  }
}
