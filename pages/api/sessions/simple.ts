import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set headers to prevent any redirect issues
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.query

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    console.log('Simple Sessions API - Fetching for user:', userId)

    // Simple query without pagination first
    const { data, error } = await supabaseAdmin
      .from('interview_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Simple Sessions API - Error:', error)
      return res.status(500).json({ 
        error: 'Database error', 
        details: error.message 
      })
    }

    console.log('Simple Sessions API - Found sessions:', data?.length || 0)

    // Transform data to match frontend interface
    const sessions = (data || []).map(session => ({
      id: session.id,
      company: session.company,
      position: session.position,
      endsIn: session.status === 'active' ? `${session.duration_minutes}m` : 'Expired',
      aiUsage: session.ai_usage || 0,
      createdAt: session.created_at,
      status: session.status
    }))

    return res.status(200).json({
      success: true,
      sessions,
      total: sessions.length
    })

  } catch (error) {
    console.error('Simple Sessions API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
