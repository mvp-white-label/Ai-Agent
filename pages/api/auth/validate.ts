import { NextApiRequest, NextApiResponse } from 'next'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { sessionToken } = req.body

    if (!sessionToken) {
      return res.status(401).json({ error: 'No session token provided' })
    }

    // Verify the JWT session token
    const { payload } = await jwtVerify(sessionToken, secret)

    return res.status(200).json({
      valid: true,
      user: {
        id: payload.userId,
        email: payload.email,
        name: payload.name,
        approved: payload.approved,
      }
    })

  } catch (error) {
    console.error('Session validation error:', error)
    return res.status(401).json({ error: 'Invalid session token' })
  }
}


