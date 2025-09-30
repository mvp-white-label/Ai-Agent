import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { id } = req.query

    if (!id || id === 'undefined') {
      return res.status(400).json({ error: 'Resume ID is required' })
    }

    // Get resume record
    const { data: resume, error: fetchError } = await supabaseAdmin
      .from('resumes')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !resume) {
      return res.status(404).json({ error: 'Resume not found' })
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('resumes')
      .download(resume.file_path)

    if (downloadError || !fileData) {
      return res.status(404).json({ error: 'File not found in storage' })
    }

    // Convert blob to buffer
    const buffer = await fileData.arrayBuffer()
    const fileBuffer = Buffer.from(buffer)

    // Set appropriate headers
    res.setHeader('Content-Type', resume.file_type || 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${resume.filename}"`)
    res.setHeader('Content-Length', fileBuffer.length)

    // Send file
    res.send(fileBuffer)

  } catch (error) {
    console.error('Download resume error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}


