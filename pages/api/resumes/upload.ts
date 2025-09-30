import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseClient'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const form = formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB limit
      filter: ({ mimetype }) => {
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        return allowedTypes.includes(mimetype || '')
      }
    })

    const [fields, files] = await form.parse(req)
    const file = Array.isArray(files.file) ? files.file[0] : files.file
    const userId = Array.isArray(fields.userId) ? fields.userId[0] : fields.userId
    const title = Array.isArray(fields.title) ? fields.title[0] : fields.title

    if (!file || !userId || !title) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Read file data
    const fileData = fs.readFileSync(file.filepath)
    const fileBuffer = Buffer.from(fileData)

    // Upload to Supabase Storage
    const fileName = `${userId}/${Date.now()}-${file.originalFilename}`
    console.log('Upload Resume API - Uploading to storage:', fileName)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('resumes')
      .upload(fileName, fileBuffer, {
        contentType: file.mimetype || 'application/octet-stream',
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return res.status(500).json({ error: 'Failed to upload file to storage' })
    }

    console.log('Upload Resume API - Successfully uploaded to storage:', uploadData.path)

    // Save resume record to database
    console.log('Upload Resume API - Saving to database...')
    const { data, error } = await supabaseAdmin
      .from('resumes')
      .insert([{
        user_id: userId,
        title: title,
        filename: file.originalFilename || 'resume',
        file_path: uploadData.path,
        file_size: file.size,
        file_type: file.mimetype || 'application/octet-stream',
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      console.error('Database insert error:', error)
      // Clean up uploaded file if database insert fails
      console.log('Upload Resume API - Cleaning up uploaded file due to database error')
      await supabaseAdmin.storage.from('resumes').remove([uploadData.path])
      return res.status(500).json({ error: 'Failed to save resume record' })
    }

    console.log('Upload Resume API - Successfully saved to database:', data.id)

    // Clean up temporary file
    fs.unlinkSync(file.filepath)

    return res.status(201).json({
      success: true,
      message: 'Resume uploaded successfully',
      resume: {
        id: data.id,
        title: data.title,
        filename: data.filename,
        file_size: data.file_size,
        file_type: data.file_type,
        created_at: data.created_at
      }
    })

  } catch (error) {
    console.error('Resume upload error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
