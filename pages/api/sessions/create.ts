import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { 
      userId, 
      sessionType, 
      company, 
      position, 
      durationMinutes,
      language,
      aiModel,
      extraContext,
      resumeId
    } = req.body

    if (!userId || !sessionType) {
      return res.status(400).json({ error: 'User ID and session type are required' })
    }

    // Create interview session in database
    const { data, error } = await supabaseAdmin
      .from('interview_sessions')
      .insert([{
        user_id: userId,
        session_type: sessionType, // 'trial' or 'full'
        company: company || 'General Interview',
        position: position || 'Software Engineer',
        duration_minutes: durationMinutes || (sessionType === 'trial' ? 10 : 30),
        language: language || 'English',
        ai_model: aiModel || 'Gemini 2.0 Flash',
        extra_context: extraContext || null,
        resume_id: resumeId || null,
        status: 'active',
        ai_usage: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating interview session:', error)
      return res.status(500).json({ error: 'Failed to create interview session' })
    }

    return res.status(201).json({
      success: true,
      message: 'Interview session created successfully',
      session: data
    })

  } catch (error) {
    console.error('Session creation error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}


