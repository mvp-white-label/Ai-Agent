import { NextApiRequest, NextApiResponse } from 'next'
import { UserService } from '../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, name, password } = req.body

    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Email, name, and password are required' })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' })
    }

    // Check if user already exists
    const existingUser = await UserService.getUserByEmail(email)
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' })
    }

    // Create new user
    const user = await UserService.createUserWithPassword(email, name, password)
    
    if (!user) {
      return res.status(500).json({ error: 'Failed to create user' })
    }

    return res.status(201).json({
      success: true,
      message: 'User created successfully. Please wait for admin approval.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        approved: user.approved,
      },
    })

  } catch (error) {
    console.error('Signup error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}


