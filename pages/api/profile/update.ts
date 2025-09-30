import { NextApiRequest, NextApiResponse } from 'next'
import { UserService } from '../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, name, email } = req.body

    if (!userId || !name || !email) {
      return res.status(400).json({ error: 'User ID, name, and email are required' })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    // Check if email is already taken by another user
    const existingUser = await UserService.getUserByEmail(email)
    if (existingUser && existingUser.id !== userId) {
      return res.status(409).json({ error: 'Email is already taken by another user' })
    }

    // Update user profile
    const updatedUser = await UserService.updateUser(userId, { name, email })
    
    if (!updatedUser) {
      return res.status(500).json({ error: 'Failed to update user profile' })
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        approved: updatedUser.approved,
      },
    })

  } catch (error) {
    console.error('Profile update error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}


