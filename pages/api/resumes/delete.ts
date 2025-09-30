import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { id } = req.query

    console.log('Delete Resume API - Request params:', { id })

    if (!id || id === 'undefined') {
      console.error('Delete Resume API - Resume ID is missing or undefined')
      return res.status(400).json({ error: 'Resume ID is required' })
    }

    // First get the resume record to get the file path
    const { data: resume, error: fetchError } = await supabaseAdmin
      .from('resumes')
      .select('file_path')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Delete Resume API - Fetch error:', fetchError)
      return res.status(404).json({ error: 'Resume not found' })
    }

    // Delete from storage
    if (resume.file_path) {
      console.log('Delete Resume API - Deleting from storage:', resume.file_path)
      const { error: storageError } = await supabaseAdmin.storage
        .from('resumes')
        .remove([resume.file_path])

      if (storageError) {
        console.error('Delete Resume API - Storage delete error:', storageError)
        // Continue with database deletion even if storage deletion fails
      } else {
        console.log('Delete Resume API - Successfully deleted from storage')
      }
    } else {
      console.log('Delete Resume API - No file path found, skipping storage deletion')
    }

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('resumes')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Delete Resume API - Database delete error:', deleteError)
      return res.status(500).json({ error: 'Failed to delete resume from database' })
    }

    console.log('Delete Resume API - Successfully deleted resume:', id)

    return res.status(200).json({
      success: true,
      message: 'Resume deleted successfully'
    })

  } catch (error) {
    console.error('Delete resume error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}


