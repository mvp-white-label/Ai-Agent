import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('Test API - Checking database connection and table structure')
    
    // Test basic connection
    const { data: testData, error: testError } = await supabaseAdmin
      .from('interview_sessions')
      .select('count')
      .limit(1)

    if (testError) {
      console.error('Test API - Database error:', testError)
      return res.status(500).json({ 
        error: 'Database connection failed', 
        details: testError.message,
        code: testError.code
      })
    }

    // Get table info
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('interview_sessions')
      .select('*')
      .limit(5)

    if (sessionsError) {
      console.error('Test API - Sessions query error:', sessionsError)
      return res.status(500).json({ 
        error: 'Sessions query failed', 
        details: sessionsError.message,
        code: sessionsError.code
      })
    }

    console.log('Test API - Success:', { sessionsCount: sessions?.length || 0 })

    return res.status(200).json({
      success: true,
      message: 'Database connection successful',
      sessionsCount: sessions?.length || 0,
      sampleSessions: sessions || []
    })

  } catch (error) {
    console.error('Test API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
