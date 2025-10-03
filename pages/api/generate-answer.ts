import { NextApiRequest, NextApiResponse } from 'next'
import { geminiModel } from '../../lib/geminiClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { question, resumeText, skills, experience } = req.body

    if (!question || !resumeText) {
      return res.status(400).json({ error: 'Missing question or resume text' })
    }

    console.log('Generating answer for question:', question)

    const prompt = `You are an AI interview coach. Based on the candidate's resume, generate a comprehensive answer for this interview question.

Question: ${question}

Candidate's Resume:
${resumeText}

Skills: ${skills ? skills.join(', ') : 'Not specified'}

Experience: ${experience ? JSON.stringify(experience) : 'Not specified'}

Please generate a detailed, professional answer that:
1. Uses specific examples from their resume
2. Demonstrates their skills and experience
3. Shows their problem-solving approach
4. Is structured and easy to follow
5. Includes relevant technical details
6. Shows confidence and expertise

Format the answer in a clear, interview-ready manner.`;

    const result = await geminiModel.generateContent(prompt)
    const response = await result.response
    const answer = response.text()

    console.log('Generated answer successfully')

    return res.status(200).json({
      success: true,
      answer: answer,
      question: question
    })

  } catch (error) {
    console.error('Error generating answer:', error)
    return res.status(500).json({ 
      error: 'Failed to generate answer',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

