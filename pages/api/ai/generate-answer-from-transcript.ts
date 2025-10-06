import { NextApiRequest, NextApiResponse } from 'next'
import { geminiModel } from '../../../lib/geminiClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🎯 API - generate-answer-from-transcript called')
  console.log('🎯 API - Method:', req.method)
  console.log('🎯 API - Body:', req.body)
  
  if (req.method !== 'POST') {
    console.log('🎯 API - Method not allowed')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { transcript, context, sessionId } = req.body

    if (!transcript || transcript.trim().length === 0) {
      console.log('🎯 API - No transcript provided')
      return res.status(400).json({ error: 'Transcript is required' })
    }

    console.log('🎯 API - Generating AI answer for transcript:', transcript)
    console.log('🎯 API - Context:', context)
    console.log('🎯 API - Session ID:', sessionId)
    
    // Check if Gemini API key is available
    const geminiApiKey = process.env.GEMINI_API_KEY
    console.log('🎯 API - Gemini API key available:', !!geminiApiKey)
    console.log('🎯 API - Gemini API key length:', geminiApiKey?.length || 0)

    // Create a comprehensive prompt for AI answer generation
    const prompt = `You are an AI interview coach and assistant. Based on the following transcript from an interview session, generate a helpful and professional response.

Context: ${context || 'General interview session'}

Transcript: "${transcript}"

Please generate a response that:
1. Acknowledges what was said in the transcript
2. Provides helpful feedback or suggestions
3. Offers relevant follow-up questions if appropriate
4. Maintains a professional and supportive tone
5. Is concise but informative (2-3 sentences)

Format your response as a direct answer that could be used in the interview context.`;

    const result = await geminiModel.generateContent(prompt)
    const response = await result.response
    const answer = response.text()

    console.log('Generated AI answer successfully')

    return res.status(200).json({
      success: true,
      answer: answer.trim(),
      transcript: transcript,
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error generating AI answer:', error)
    
    // Handle specific Gemini API quota errors
    if (error instanceof Error && error.message.includes('429 Too Many Requests')) {
      // For development, provide a mock response when quota is exceeded
      if (process.env.NODE_ENV === 'development') {
        console.log('🎯 API - Quota exceeded, providing mock response for development')
        return res.status(200).json({
          success: true,
          answer: `[Mock Response - Quota Exceeded] Based on the transcript "${transcript}", here's a suggested response: This is a great question about ${transcript.toLowerCase()}. I would recommend discussing your relevant experience and how it applies to this specific context.`,
          transcript: transcript,
          sessionId: sessionId,
          timestamp: new Date().toISOString(),
          isMockResponse: true
        })
      }
      
      return res.status(429).json({ 
      error: 'AI quota exceeded',
      details: 'You have exceeded the daily limit for AI requests. Please try again tomorrow or upgrade your plan.',
      quotaExceeded: true
    })
    }
    
    return res.status(500).json({ 
      error: 'Failed to generate AI answer',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}


