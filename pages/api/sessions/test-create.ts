import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' })
    }

    console.log('Testing session creation for user:', userId)

    // Test creating a simple session
    const sessionData = {
      user_id: userId,
      session_type: 'trial',
      company: 'Test Company',
      position: 'Test Position',
      duration_minutes: 0,
      language: 'English',
      ai_model: 'Gemini 2.0 Flash',
      extra_context: null,
      resume_id: null,
      status: 'pending',
      ai_usage: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log('Creating test session with data:', sessionData)

    const { data, error } = await supabaseAdmin
      .from('interview_sessions')
      .insert([sessionData])
      .select()
      .single()

    if (error) {
      console.error('Error creating test session:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return res.status(500).json({ 
        error: 'Failed to create test session',
        details: error.message,
        code: error.code
      })
    }

    console.log('Successfully created test session:', data)

    return res.status(201).json({
      success: true,
      message: 'Test session created successfully',
      session: data
    })

  } catch (error) {
    console.error('Test session creation error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}



