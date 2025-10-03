import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.query

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' })
    }

    console.log('Checking resumes for user:', userId)

    // Get all resumes for the user
    const { data: resumes, error: resumesError } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', userId)

    if (resumesError) {
      console.error('Error fetching resumes:', resumesError)
      return res.status(500).json({ 
        error: 'Failed to fetch resumes',
        details: resumesError.message 
      })
    }

    console.log('Found resumes:', resumes)

    return res.status(200).json({
      success: true,
      userId,
      resumeCount: resumes?.length || 0,
      resumes: resumes || []
    })

  } catch (error) {
    console.error('Error checking resumes:', error)
    return res.status(500).json({ 
      error: 'Failed to check resumes',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

