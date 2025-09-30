import { NextApiRequest, NextApiResponse } from 'next'
import { UserService } from '../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // In a real app, you'd check if the user is an admin here
    // For now, we'll just return all users
    
    // This is a simplified implementation
    // In production, you'd have proper admin authentication and pagination
    const users = await UserService.getAllUsers() // You'd need to implement this method
    
    return res.status(200).json({
      success: true,
      users: users || []
    })

  } catch (error) {
    console.error('Error fetching users:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
