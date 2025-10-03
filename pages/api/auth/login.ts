import { NextApiRequest, NextApiResponse } from 'next'
import { UserService, supabaseAdmin } from '../../../lib/supabaseClient'
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

    // Try to allocate welcome bonus credits for new users
    try {
      const { data: userCredits } = await supabaseAdmin
        .from('user_credits')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

      // If no credits record exists, this might be a new user - allocate welcome bonus
      if (!userCredits) {
        const { data: allocated } = await supabaseAdmin
          .rpc('allocate_credits_by_rule', {
            user_uuid: user.id,
            rule_name_param: 'welcome_bonus'
          });
        
        if (allocated) {
          console.log('Login API - Welcome bonus credits allocated');
        }
      }
    } catch (error) {
      // Don't fail login if credit allocation fails
      console.error('Error allocating welcome bonus credits:', error);
    }

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
