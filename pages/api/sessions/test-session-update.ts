import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { sessionId, userId } = req.query

    if (!sessionId || !userId) {
      return res.status(400).json({ error: 'Missing sessionId or userId' })
    }

    console.log('Testing session update with:', { sessionId, userId })

    // Get current session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('interview_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single()

    if (sessionError) {
      console.error('Session lookup error:', sessionError)
      return res.status(404).json({ 
        error: 'Session not found', 
        details: sessionError.message 
      })
    }

    console.log('Current session:', session)

    // Test updating to active status
    const updateData = {
      status: 'active',
      ai_usage: (session.ai_usage || 0) + 1,
      started_at: session.started_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log('Updating with:', updateData)

    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('interview_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return res.status(500).json({ 
        error: 'Failed to update', 
        details: updateError.message 
      })
    }

    console.log('Updated session:', updatedSession)

    return res.status(200).json({
      success: true,
      originalSession: session,
      updatedSession: updatedSession,
      message: 'Session update test successful'
    })

  } catch (error) {
    console.error('Test error:', error)
    return res.status(500).json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}




