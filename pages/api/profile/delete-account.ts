import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    console.log('Delete Account API - Deleting user:', userId)

    // Verify the user exists
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.error('User not found:', userError)
      return res.status(404).json({ error: 'User not found' })
    }

    console.log('Found user to delete:', { id: user.id, email: user.email, name: user.name })

    // Delete the user (CASCADE will handle related data)
    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return res.status(500).json({ 
        error: 'Failed to delete account',
        details: deleteError.message 
      })
    }

    console.log('Successfully deleted user and all related data')

    return res.status(200).json({
      success: true,
      message: 'Account and all associated data have been permanently deleted'
    })

  } catch (error) {
    console.error('Delete Account API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}



