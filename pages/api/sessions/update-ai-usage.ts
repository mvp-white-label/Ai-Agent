import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { sessionId, userId } = req.body
    console.log('Update AI Usage API called with:', { sessionId, userId })

    if (!sessionId || !userId) {
      console.log('Missing required fields')
      return res.status(400).json({ error: 'Missing required fields: sessionId, userId' })
    }

    // Verify the session belongs to the user
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('interview_sessions')
      .select('id, user_id, ai_usage')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single()

    if (sessionError || !session) {
      console.log('Session not found or access denied:', { sessionError, session })
      return res.status(404).json({ error: 'Session not found or access denied' })
    }

    console.log('Found session:', { id: session.id, current_ai_usage: session.ai_usage })

    // Increment AI usage count
    const newCount = (session.ai_usage || 0) + 1
    console.log('Updating AI usage from', session.ai_usage, 'to', newCount)

    const { data, error } = await supabaseAdmin
      .from('interview_sessions')
      .update({ 
        ai_usage: newCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      console.error('Error updating AI usage count:', error)
      return res.status(500).json({ error: 'Failed to update AI usage count' })
    }

    console.log('Successfully updated AI usage count:', data)

    return res.status(200).json({ 
      success: true, 
      aiUsageCount: newCount,
      message: 'AI usage count updated successfully'
    })

  } catch (error) {
    console.error('Error updating AI usage:', error)
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to update AI usage count',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
