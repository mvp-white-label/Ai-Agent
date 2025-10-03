import { NextApiRequest, NextApiResponse } from 'next'
import { parseResumeWithGemini } from '../../../lib/geminiClient'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { resumeId, resumeText, userId } = req.body

    console.log('Parse request received:', { resumeId, userId, resumeTextLength: resumeText?.length })

    if (!resumeId || !resumeText || !userId) {
      return res.status(400).json({ error: 'Missing required fields: resumeId, resumeText, userId' })
    }

    // Verify the resume belongs to the user
    console.log('Checking resume ownership:', { resumeId, userId })
    const { data: resume, error: resumeError } = await supabase
      .from('resumes')
      .select('id, user_id')
      .eq('id', resumeId)
      .eq('user_id', userId)
      .single()

    console.log('Resume check result:', { resume, resumeError })

    if (resumeError) {
      console.error('Resume query error:', resumeError)
      return res.status(404).json({ 
        error: 'Resume not found or access denied',
        details: resumeError.message 
      })
    }

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' })
    }

    // Check if resume is already parsed
    const { data: existingParsedData } = await supabase
      .from('resume_parsed_data')
      .select('id, parsing_status')
      .eq('resume_id', resumeId)
      .single()

    if (existingParsedData && existingParsedData.parsing_status === 'completed') {
      // Get the actual parsed data from database
      const { data: parsedDataFromDb, error: fetchError } = await supabase
        .from('resume_parsed_data')
        .select('*')
        .eq('id', existingParsedData.id)
        .single()

      if (fetchError) {
        console.error('Error fetching existing parsed data:', fetchError)
        throw fetchError
      }

      // Convert database format to frontend format
      const frontendData = {
        skills: parsedDataFromDb.parsed_skills || [],
        experience: parsedDataFromDb.parsed_experience || [],
        education: parsedDataFromDb.parsed_education || [],
        certifications: parsedDataFromDb.parsed_certifications || [],
        projects: parsedDataFromDb.parsed_projects || [],
        summary: parsedDataFromDb.parsed_summary || '',
        suggestedQuestions: parsedDataFromDb.suggested_questions || []
      }

      return res.status(200).json({ 
        success: true,
        message: 'Resume already parsed',
        parsedDataId: existingParsedData.id,
        data: frontendData
      })
    }

    // Update status to pending if it exists
    if (existingParsedData) {
      await supabase
        .from('resume_parsed_data')
        .update({ 
          parsing_status: 'pending',
          parsing_error: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingParsedData.id)
    }

    // Parse resume with Gemini
    console.log('Starting Gemini parsing...')
    const parsedData = await parseResumeWithGemini(resumeText)
    console.log('Gemini parsing completed:', { 
      skillsCount: parsedData.skills?.length,
      experienceCount: parsedData.experience?.length,
      questionsCount: parsedData.suggestedQuestions?.length
    })

    // Prepare data for database insertion
    const dbData = {
      resume_id: resumeId,
      parsed_skills: parsedData.skills,
      parsed_experience: parsedData.experience,
      parsed_education: parsedData.education,
      parsed_certifications: parsedData.certifications,
      parsed_projects: parsedData.projects,
      parsed_summary: parsedData.summary,
      suggested_questions: parsedData.suggestedQuestions,
      ai_model_used: 'gemini-2.0-flash-exp',
      parsing_status: 'completed',
      parsing_error: null,
      updated_at: new Date().toISOString()
    }

    // Insert or update parsed data
    console.log('Saving parsed data to database...')
    let result
    if (existingParsedData) {
      console.log('Updating existing parsed data:', existingParsedData.id)
      const { data, error } = await supabase
        .from('resume_parsed_data')
        .update(dbData)
        .eq('id', existingParsedData.id)
        .select()
        .single()

      if (error) {
        console.error('Update error:', error)
        throw error
      }
      result = data
    } else {
      console.log('Inserting new parsed data')
      const { data, error } = await supabase
        .from('resume_parsed_data')
        .insert(dbData)
        .select()
        .single()

      if (error) {
        console.error('Insert error:', error)
        throw error
      }
      result = data
    }

    console.log('Database operation successful:', result)

    return res.status(200).json({
      success: true,
      message: 'Resume parsed successfully',
      parsedDataId: result.id,
      data: parsedData
    })

  } catch (error) {
    console.error('Error parsing resume:', error)
    
    // Update status to failed if we have a resumeId
    if (req.body.resumeId) {
      try {
        await supabase
          .from('resume_parsed_data')
          .upsert({
            resume_id: req.body.resumeId,
            parsing_status: 'failed',
            parsing_error: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString()
          })
      } catch (updateError) {
        console.error('Error updating failed status:', updateError)
      }
    }

    return res.status(500).json({ 
      error: 'Failed to parse resume',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
