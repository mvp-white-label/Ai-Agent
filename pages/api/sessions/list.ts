import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers to prevent any redirect issues
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  console.log('Sessions API - Request received:', { method: req.method, url: req.url, query: req.query })
  
  if (req.method !== 'GET') {
    console.log('Sessions API - Method not allowed:', req.method)
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, page = 1, limit = 10 } = req.query

    console.log('Sessions API - Request params:', { userId, page, limit })

    if (!userId || userId === 'undefined') {
      console.error('Sessions API - User ID is missing or undefined')
      return res.status(400).json({ error: 'User ID is required' })
    }

    const offset = (Number(page) - 1) * Number(limit)

    console.log('Sessions API - Fetching sessions for user:', userId)

    // Get total count
    console.log('Sessions API - Getting count for user:', userId)
    const { count, error: countError } = await supabaseAdmin
      .from('interview_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (countError) {
      console.error('Sessions API - Count error:', countError)
      return res.status(500).json({ error: 'Failed to fetch session count', details: countError.message })
    }
    
    console.log('Sessions API - Count result:', count)

    // Get sessions with pagination
    console.log('Sessions API - Getting sessions with pagination:', { offset, limit: Number(limit) })
    const { data, error } = await supabaseAdmin
      .from('interview_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1)

    if (error) {
      console.error('Sessions API - Fetch error:', error)
      return res.status(500).json({ error: 'Failed to fetch interview sessions', details: error.message })
    }
    
    console.log('Sessions API - Sessions fetched:', data?.length || 0)

    console.log('Sessions API - Found sessions:', data?.length || 0)

    // Transform data to match frontend interface
    const sessions = (data || []).map(session => ({
      id: session.id,
      company: session.company,
      position: session.position,
      endsIn: session.status === 'active' ? `${session.duration_minutes}m` : 'Completed',
      aiUsage: session.ai_usage || 0,
      createdAt: session.created_at,
      status: session.status
    }))

    return res.status(200).json({
      success: true,
      sessions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    })

  } catch (error) {
    console.error('Session list error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
