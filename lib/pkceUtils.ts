/**
 * PKCE (Proof Key for Code Exchange) utilities for Microsoft OAuth
 * This is needed for Single Page Applications to exchange authorization codes for tokens
 */

/**
 * Generate a random string for PKCE
 */
export function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  let result = ''
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)
  
  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length]
  }
  
  return result
}

/**
 * Generate code verifier for PKCE
 */
export function generateCodeVerifier(): string {
  return generateRandomString(128)
}

/**
 * Generate code challenge from code verifier
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(codeVerifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const base64 = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Exchange authorization code for tokens using PKCE
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string,
  clientId: string,
  tenantId: string
): Promise<{ accessToken: string; idToken: string }> {
  const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
  
  const params = new URLSearchParams({
    client_id: clientId,
    code: code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier,
  })

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token exchange failed: ${error}`)
  }

  const tokenData = await response.json()
  
  if (!tokenData.access_token || !tokenData.id_token) {
    throw new Error('No tokens received from Microsoft')
  }

  return {
    accessToken: tokenData.access_token,
    idToken: tokenData.id_token,
  }
}
