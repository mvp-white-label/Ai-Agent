import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseClient'
import { verifyToken } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('Session creation request received:', req.body);

    // Verify authentication
    const authResult = await verifyToken(req);
    if (!authResult.success) {
      console.error('Authentication failed:', authResult.error);
      return res.status(401).json({ error: 'Unauthorized', details: authResult.error });
    }

    const { 
      sessionType, 
      company, 
      position, 
      durationMinutes,
      language,
      aiModel,
      extraContext,
      resumeId
    } = req.body

    const userId = authResult.userId;
    console.log('Authenticated user ID:', userId);

    if (!sessionType) {
      return res.status(400).json({ error: 'Session type is required' })
    }

    // Only check credits for full interviews, not trial sessions
    if (sessionType === 'full') {
      try {
        const { data: hasCredits, error: creditCheckError } = await supabaseAdmin
          .rpc('check_user_credits', {
            user_uuid: userId,
            required_credits: 1
          });

        if (creditCheckError) {
          console.error('Error checking user credits:', creditCheckError);
          return res.status(500).json({ error: 'Failed to validate credits' });
        }

        if (!hasCredits) {
          return res.status(400).json({ 
            error: 'Insufficient credits',
            message: 'You need at least 1 credit to start a real interview. Please purchase credits or try a free trial session.',
            requiredCredits: 1
          });
        }
      } catch (error) {
        // If credit system is not set up yet, allow full sessions to proceed
        console.log('Credit system not available, allowing session creation');
      }
    }
    // Trial sessions are always free - no credit check needed

    // Create interview session in database
    const sessionData = {
      user_id: userId,
      session_type: sessionType, // 'trial' or 'full'
      company: company || 'General Interview',
      position: position || 'Software Engineer',
      duration_minutes: 0, // Will be calculated when interview ends
      language: language || 'English',
      ai_model: aiModel || 'Gemini 2.0 Flash',
      extra_context: extraContext || null,
      resume_id: resumeId || null,
      status: 'pending', // Start as pending, will be set to active when interview starts
      ai_usage: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log('Creating session with data:', sessionData)

    const { data, error } = await supabaseAdmin
      .from('interview_sessions')
      .insert([sessionData])
      .select()
      .single()

    if (error) {
      console.error('Error creating interview session:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return res.status(500).json({ 
        error: 'Failed to create interview session',
        details: error.message,
        code: error.code,
        hint: error.hint
      })
    }

    console.log('Successfully created session:', data)

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


