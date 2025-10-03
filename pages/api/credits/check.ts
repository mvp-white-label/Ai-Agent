import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabaseClient';
import { verifyToken } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authResult = await verifyToken(req);
    if (!authResult.success) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // For now, always return default values since credit system is not set up
    return res.status(200).json({
      success: true,
      credits: {
        total: 0,
        used: 0,
        available: 0
      }
    });

  } catch (error) {
    console.error('Error in check credits API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
