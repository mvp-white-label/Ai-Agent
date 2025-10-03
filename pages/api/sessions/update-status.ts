import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { sessionId, userId, status, aiUsage, startedAt, endedAt } = req.body
    console.log('Update Session Status API called with:', { sessionId, userId, status, aiUsage, startedAt, endedAt })

    if (!sessionId || !userId || !status) {
      console.log('Missing required fields')
      return res.status(400).json({ error: 'Missing required fields: sessionId, userId, status' })
    }

    // Verify the session belongs to the user
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('interview_sessions')
      .select('id, user_id, status, ai_usage, started_at, ended_at, session_data')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single()

    if (sessionError || !session) {
      console.log('Session not found or access denied:', { sessionError, session })
      return res.status(404).json({ error: 'Session not found or access denied' })
    }

    console.log('Found session:', { id: session.id, current_status: session.status, current_ai_usage: session.ai_usage })

    // Prepare update data
    const updateData: any = {
      status: status,
      updated_at: new Date().toISOString()
    }

    // Handle AI usage - if aiUsage is provided, use it; if status is 'active' and no aiUsage provided, increment current
    if (aiUsage !== undefined) {
      updateData.ai_usage = aiUsage
    } else if (status === 'active' && session.ai_usage !== null) {
      // Increment current AI usage
      updateData.ai_usage = (session.ai_usage || 0) + 1
    } else if (status === 'active' && session.ai_usage === null) {
      // Initialize AI usage to 0 if it's null
      updateData.ai_usage = 0
    }

    // Handle started_at and ended_at timestamps
    if (startedAt) {
      updateData.started_at = startedAt
    } else if (status === 'active' && !session.started_at) {
      // Set started_at when interview becomes active for the first time
      updateData.started_at = new Date().toISOString()
    }

    if (endedAt) {
      updateData.ended_at = endedAt
    } else if (status === 'completed') {
      // Set ended_at when interview is completed
      updateData.ended_at = new Date().toISOString()
    }

    // Calculate actual duration when interview is completed
    if (status === 'completed') {
      const startTime = session.started_at || updateData.started_at
      const endTime = updateData.ended_at
      
      if (startTime && endTime) {
        const start = new Date(startTime)
        const end = new Date(endTime)
        const durationMs = end.getTime() - start.getTime()
        const durationSeconds = Math.round(durationMs / 1000) // Total seconds
        const durationMinutesDecimal = Math.round((durationMs / (1000 * 60)) * 100) / 100 // Decimal minutes with 2 decimal places
        const durationMinutes = Math.floor(durationSeconds / 60) // Full minutes
        const remainingSeconds = durationSeconds % 60 // Remaining seconds
        
        console.log('Calculating precise duration:', {
          startTime,
          endTime,
          durationMs,
          durationSeconds,
          durationMinutesDecimal,
          durationMinutes,
          remainingSeconds,
          formattedDuration: `${durationMinutes}m ${remainingSeconds}s`
        })
        
        // Store duration in decimal minutes (e.g., 1.65 minutes)
        updateData.duration_minutes = Math.max(0.01, durationMinutesDecimal) // Store as decimal minutes
        updateData.session_data = {
          ...(session.session_data || {}),
          duration_breakdown: {
            total_seconds: durationSeconds,
            decimal_minutes: durationMinutesDecimal,
            minutes: durationMinutes,
            seconds: remainingSeconds,
            formatted: `${durationMinutes}m ${remainingSeconds}s`
          }
        }
      }
    }

    console.log('Updating session with:', updateData)

    const { data, error } = await supabaseAdmin
      .from('interview_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      console.error('Error updating session status:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return res.status(500).json({ 
        error: 'Failed to update session status',
        details: error.message 
      })
    }

    console.log('Successfully updated session:', data)

    return res.status(200).json({ 
      success: true,
      session: data,
      message: 'Session status updated successfully'
    })

  } catch (error) {
    console.error('Update Session Status API error:', error)
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
