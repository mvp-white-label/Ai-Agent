import { NextApiRequest, NextApiResponse } from 'next'
import pdf from 'pdf-parse'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { fileData } = req.body

    if (!fileData) {
      return res.status(400).json({ error: 'No file data provided' })
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(fileData, 'base64')
    
    // Extract text from PDF
    const data = await pdf(buffer)
    
    console.log('PDF text extraction successful')
    console.log('Text length:', data.text.length)
    console.log('Text preview:', data.text.substring(0, 200))

    return res.status(200).json({
      success: true,
      text: data.text,
      pages: data.numpages,
      info: data.info
    })

  } catch (error) {
    console.error('Error extracting text from PDF:', error)
    return res.status(500).json({ 
      error: 'Failed to extract text from PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

