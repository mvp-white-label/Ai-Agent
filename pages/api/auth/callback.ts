import { NextApiRequest, NextApiResponse } from 'next'
import { UserService } from '../../../lib/supabaseClient'
import { createSessionFromMicrosoftUser } from '../../../lib/auth'
import { SignJWT } from 'jose'

// Microsoft Graph API interface
interface MicrosoftUser {
  id: string
  displayName: string
  mail: string
  userPrincipalName: string
}

// Token validation result interface
interface TokenValidationResult {
  isValid: boolean
  user?: MicrosoftUser
  error?: string
}

/**
 * Validates Microsoft ID token and fetches user information
 * For SPA flow - we validate the ID token and use it to get user info
 */
async function validateMicrosoftToken(idToken: string, accessToken: string): Promise<TokenValidationResult> {
  try {
    // Decode the ID token to get user information
    const base64Url = idToken.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      Buffer.from(base64, 'base64')
        .toString('binary')
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    
    const tokenPayload = JSON.parse(jsonPayload)
    
    // Validate token (basic checks)
    const now = Math.floor(Date.now() / 1000)
    if (tokenPayload.exp < now) {
      return { isValid: false, error: 'Token expired' }
    }
    
    if (tokenPayload.iss !== `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`) {
      return { isValid: false, error: 'Invalid token issuer' }
    }
    
    if (tokenPayload.aud !== process.env.AZURE_CLIENT_ID) {
      return { isValid: false, error: 'Invalid token audience' }
    }
    
    // Use the access token to fetch user details from Microsoft Graph
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      return { isValid: false, error: 'Failed to fetch user details from Microsoft Graph' }
    }
    
    const userData: MicrosoftUser = await response.json()
    
    return {
      isValid: true,
      user: userData,
    }
  } catch (error) {
    console.error('Token validation error:', error)
    return { isValid: false, error: 'Token validation failed' }
  }
}

/**
 * Creates a JWT session token
 */
async function createSessionToken(user: any): Promise<string> {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)
  
  return await new SignJWT({
    userId: user.id,
    email: user.email,
    name: user.name,
    approved: user.approved,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret)
}

/**
 * Exchange authorization code for tokens using PKCE
 */
async function exchangeCodeForTokens(authCode: string, redirectUri: string): Promise<{ accessToken: string; idToken: string } | null> {
  try {
    const tokenEndpoint = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`
    
    const params = new URLSearchParams({
      client_id: process.env.AZURE_CLIENT_ID!,
      code: authCode,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      // For SPA, we don't need client_secret
    })

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Token exchange failed:', errorData)
      return null
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      idToken: data.id_token,
    }
  } catch (error) {
    console.error('Token exchange error:', error)
    return null
  }
}

/**
 * Handle authorization code flow for SPA
 * Exchange code for tokens to get real Microsoft user data
 */
async function handleAuthorizationCodeFlow(authCode: string, redirectUri: string, res: NextApiResponse) {
  try {
    console.log('Handling authorization code flow for SPA...')
    console.log('Auth code:', authCode.substring(0, 50) + '...')
    console.log('Redirect URI:', redirectUri)

    // Try to exchange the authorization code for tokens
    const tokens = await exchangeCodeForTokens(authCode, redirectUri)
    
    if (tokens) {
      console.log('Successfully exchanged code for tokens')
      
      // Validate the tokens and get user info
      const validationResult = await validateMicrosoftToken(tokens.idToken, tokens.accessToken)
      
      if (validationResult.isValid && validationResult.user) {
        const microsoftUser = validationResult.user
        const userEmail = microsoftUser.mail || microsoftUser.userPrincipalName
        const userName = microsoftUser.displayName

        if (!userEmail) {
          return res.status(400).json({ error: 'User email not found in Microsoft profile' })
        }

    console.log('Microsoft user email:', userEmail)
    console.log('Microsoft user name:', userName)

    // Check if user exists in our database
    console.log('Checking if user exists in database...')
    let user = await UserService.getUserByEmail(userEmail)
    console.log('User lookup result:', user ? `Found user ${user.id}` : 'No user found')

    if (!user) {
      try {
        // Create new user (not approved by default)
        const newUser = await UserService.createUser({
          email: userEmail,
          name: userName,
          approved: false,
        })

        if (!newUser) {
          return res.status(500).json({ error: 'Failed to create user' })
        }

        user = newUser
        console.log('User created successfully with real Microsoft data:', user.id)
      } catch (createError: any) {
        // Handle duplicate key error - this can happen due to race conditions
        if (createError.code === '23505') {
          console.log('User already exists due to race condition, fetching existing user...')
          // Try to fetch the existing user
          user = await UserService.getUserByEmail(userEmail)
          if (!user) {
            console.error('User exists but could not be retrieved after race condition')
            return res.status(500).json({ error: 'User exists but could not be retrieved' })
          }
          console.log('Found existing user after race condition:', user.id)
        } else {
          console.error('Error creating user:', createError)
          return res.status(500).json({ error: 'Failed to create user' })
        }
      }
    } else {
      console.log('User already exists:', user.id)
    }

    // Ensure we have a user object
    if (!user) {
      console.log('No user found, attempting to fetch existing user...')
      user = await UserService.getUserByEmail(userEmail)
      if (!user) {
        return res.status(500).json({ error: 'User not found and could not be created' })
      }
      console.log('Fetched existing user:', user.id)
    }

        // Create session token
        const sessionToken = await createSessionToken(user)

        // Set secure HTTP-only cookie
        res.setHeader('Set-Cookie', [
          `session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/`,
        ])

        console.log('Final user data:', {
          id: user.id,
          email: user.email,
          name: user.name,
          approved: user.approved
        })
        console.log('Redirect decision:', user.approved ? '/dashboard' : '/login?message=waiting-approval')

        return res.status(200).json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            approved: user.approved,
          },
          redirectTo: user.approved ? '/dashboard' : '/login?message=waiting-approval',
        })
      } else {
        console.error('Token validation failed:', validationResult.error)
        return res.status(401).json({ error: 'Token validation failed' })
      }
    } else {
      console.log('Token exchange failed, falling back to temporary user creation')
      
      // Fallback: Create a user with a unique identifier based on the auth code
      const codeHash = authCode.substring(0, 32)
      const userEmail = `microsoft-user-${codeHash}@temp.com`
      const userName = 'Microsoft User (Pending Verification)'

      console.log('Creating user with temporary email:', userEmail)

      // Check if user exists in our database
      let user = await UserService.getUserByEmail(userEmail)

      if (!user) {
        try {
          const newUser = await UserService.createUser({
            email: userEmail,
            name: userName,
            approved: false,
          })

          if (!newUser) {
            return res.status(500).json({ error: 'Failed to create user' })
          }

          user = newUser
          console.log('User created successfully with temporary data:', user.id)
        } catch (createError: any) {
          if (createError.code === '23505') {
            console.log('User already exists, fetching existing user...')
            user = await UserService.getUserByEmail(userEmail)
            if (!user) {
              return res.status(500).json({ error: 'User exists but could not be retrieved' })
            }
            console.log('Found existing user:', user.id)
          } else {
            console.error('Error creating user:', createError)
            return res.status(500).json({ error: 'Failed to create user' })
          }
        }
      } else {
        console.log('User already exists:', user.id)
      }

      // Create session token
      const sessionToken = await createSessionToken(user)

      // Set secure HTTP-only cookie
      res.setHeader('Set-Cookie', [
        `session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/`,
      ])

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          approved: user.approved,
        },
        redirectTo: user.approved ? '/dashboard' : '/login?message=waiting-approval',
        message: 'User created with temporary data. Please contact admin to update with real Microsoft account details.',
      })
    }

  } catch (error) {
    console.error('Authorization code flow error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { idToken, accessToken, authCode, redirectUri } = req.body

    // ONLY handle implicit flow - reject authorization code flow
    if (authCode) {
      console.log('Authorization code flow detected - rejecting in favor of implicit flow')
      return res.status(400).json({ 
        error: 'Authorization code flow not supported. Please use implicit flow with id_token and access_token.' 
      })
    }

    // Handle direct token flow (implicit flow) - REQUIRED
    if (!idToken || !accessToken) {
      return res.status(400).json({ error: 'ID token and access token are required for implicit flow' })
    }

    // Validate the Microsoft ID token
    const validationResult = await validateMicrosoftToken(idToken, accessToken)
    
    if (!validationResult.isValid || !validationResult.user) {
      return res.status(401).json({ 
        error: validationResult.error || 'Invalid token' 
      })
    }

    const microsoftUser = validationResult.user
    const userEmail = microsoftUser.mail || microsoftUser.userPrincipalName
    const userName = microsoftUser.displayName

    if (!userEmail) {
      return res.status(400).json({ error: 'User email not found in Microsoft profile' })
    }

    // Check if user exists in our database
    let user = await UserService.getUserByEmail(userEmail)

    if (!user) {
      try {
        // Create new user (not approved by default)
        const newUser = await UserService.createUser({
          email: userEmail,
          name: userName,
          approved: false,
        })

        if (!newUser) {
          return res.status(500).json({ error: 'Failed to create user' })
        }

        user = newUser
        console.log('User created successfully with real Microsoft data:', user.id)
      } catch (createError: any) {
        // Handle duplicate key error - user was created by another concurrent request
        if (createError.code === '23505') {
          console.log('User already exists due to concurrent request, fetching existing user...')
          user = await UserService.getUserByEmail(userEmail)
          if (!user) {
            return res.status(500).json({ error: 'User exists but could not be retrieved' })
          }
          console.log('Found existing user from concurrent request:', user.id)
        } else {
          console.error('Error creating user:', createError)
          return res.status(500).json({ error: 'Failed to create user' })
        }
      }
    } else {
      console.log('User already exists:', user.id)
    }

    // Ensure we have a user object
    if (!user) {
      console.log('No user found, attempting to fetch existing user...')
      user = await UserService.getUserByEmail(userEmail)
      if (!user) {
        return res.status(500).json({ error: 'User not found and could not be created' })
      }
      console.log('Fetched existing user:', user.id)
    }

    // Create session token
    const sessionToken = await createSessionToken(user)

    // Set secure HTTP-only cookie
    res.setHeader('Set-Cookie', [
      `session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/`,
    ])

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        approved: user.approved,
      },
      redirectTo: user.approved ? '/dashboard' : '/login?message=waiting-approval',
    })

  } catch (error) {
    console.error('Auth callback error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
