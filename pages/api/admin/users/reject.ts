import { NextApiRequest, NextApiResponse } from 'next'
import { UserService } from '../../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.query

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'User ID is required' })
    }

    // Delete user (reject)
    const success = await UserService.deleteUser(userId)

    if (!success) {
      return res.status(500).json({ error: 'Failed to reject user' })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error rejecting user:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}



