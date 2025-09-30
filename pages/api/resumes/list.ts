import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.query

    console.log('Resumes API - Request params:', { userId })

    if (!userId || userId === 'undefined') {
      console.error('Resumes API - User ID is missing or undefined')
      return res.status(400).json({ error: 'User ID is required' })
    }

    console.log('Resumes API - Fetching resumes for user:', userId)

    // Get resumes for the user
    const { data, error } = await supabaseAdmin
      .from('resumes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Resumes API - Fetch error:', error)
      return res.status(500).json({ error: 'Failed to fetch resumes' })
    }

    console.log('Resumes API - Found resumes:', data?.length || 0)

    return res.status(200).json({
      success: true,
      resumes: data || []
    })

  } catch (error) {
    console.error('Resumes list error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}


