import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('Testing database connection...')
    
    // Simple test query
    const { data, error } = await supabaseAdmin
      .from('interview_sessions')
      .select('count')
      .limit(1)

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ 
        error: 'Database error', 
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Database connection successful',
      data: data
    })

  } catch (error) {
    console.error('Test error:', error)
    return res.status(500).json({ 
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
