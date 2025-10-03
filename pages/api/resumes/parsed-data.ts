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
    const { resumeId, userId } = req.query

    if (!resumeId || !userId) {
      return res.status(400).json({ error: 'Missing required parameters: resumeId, userId' })
    }

    // Verify the resume belongs to the user
    const { data: resume, error: resumeError } = await supabase
      .from('resumes')
      .select('id, user_id')
      .eq('id', resumeId)
      .eq('user_id', userId)
      .single()

    if (resumeError || !resume) {
      return res.status(404).json({ error: 'Resume not found or access denied' })
    }

    // Get parsed data
    const { data: parsedData, error: parsedError } = await supabase
      .from('resume_parsed_data')
      .select('*')
      .eq('resume_id', resumeId)
      .single()

    if (parsedError) {
      if (parsedError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Resume not parsed yet' })
      }
      throw parsedError
    }

    return res.status(200).json({
      success: true,
      data: parsedData
    })

  } catch (error) {
    console.error('Error fetching parsed resume data:', error)
    return res.status(500).json({ 
      error: 'Failed to fetch parsed resume data',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

