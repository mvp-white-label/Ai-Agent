import { NextApiRequest, NextApiResponse } from 'next'
import { UserService } from '../../../lib/supabaseClient'
import { SignJWT } from 'jose'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Verify user credentials
    const user = await UserService.verifyPassword(email, password)
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Create session token
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)
    const sessionToken = await new SignJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      approved: user.approved,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret)

    // Return session token in response for localStorage storage
    console.log('Login API - User approved:', user.approved)
    console.log('Login API - Session token created successfully')

    return res.status(200).json({
      success: true,
      sessionToken: sessionToken, // Send token to frontend for localStorage
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        approved: user.approved,
      },
      redirectTo: user.approved ? '/dashboard' : '/login?message=waiting-approval',
    })

  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
