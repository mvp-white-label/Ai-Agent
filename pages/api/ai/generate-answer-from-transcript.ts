import { NextApiRequest, NextApiResponse } from 'next'
import { geminiModel } from '../../../lib/geminiClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { transcript, context, sessionId } = req.body

    if (!transcript || transcript.trim().length === 0) {
      return res.status(400).json({ error: 'Transcript is required' })
    }

    console.log('Generating AI answer for transcript:', transcript)

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
    return res.status(500).json({ 
      error: 'Failed to generate AI answer',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}


