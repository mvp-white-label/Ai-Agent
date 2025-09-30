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

    // Update user approval status
    const success = await UserService.updateUserApproval(userId, true)

    if (!success) {
      return res.status(500).json({ error: 'Failed to approve user' })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error approving user:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}



