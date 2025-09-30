import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { sessionId, userId } = req.body

    console.log('Delete Session API - Request params:', { sessionId, userId })

    if (!sessionId || !userId) {
      console.error('Delete Session API - Missing required parameters')
      return res.status(400).json({ error: 'Session ID and User ID are required' })
    }

    // First, verify the session belongs to the user
    const { data: session, error: fetchError } = await supabaseAdmin
      .from('interview_sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      console.error('Delete Session API - Session not found or access denied:', fetchError)
      return res.status(404).json({ error: 'Session not found or access denied' })
    }

    // Delete the session
    const { error: deleteError } = await supabaseAdmin
      .from('interview_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Delete Session API - Delete error:', deleteError)
      return res.status(500).json({ error: 'Failed to delete session' })
    }

    console.log('Delete Session API - Session deleted successfully:', sessionId)

    return res.status(200).json({
      success: true,
      message: 'Session deleted successfully'
    })

  } catch (error) {
    console.error('Delete session error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
