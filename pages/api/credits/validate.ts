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

    const userId = authResult.userId;
    const { requiredCredits = 1, action = 'interview_start' } = req.body;

    if (!requiredCredits || requiredCredits <= 0) {
      return res.status(400).json({ error: 'Valid required credits amount is needed' });
    }

    // Check if user has enough credits using the database function
    const { data: hasCredits, error: checkError } = await supabase
      .rpc('check_user_credits', {
        user_uuid: userId,
        required_credits: requiredCredits
      });

    if (checkError) {
      console.error('Error checking user credits:', checkError);
      return res.status(500).json({ error: 'Failed to validate credits' });
    }

    // Get current credit balance for response
    const { data: userCredits, error: creditsError } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (creditsError && creditsError.code !== 'PGRST116') {
      console.error('Error fetching user credits:', creditsError);
      return res.status(500).json({ error: 'Failed to fetch credits' });
    }

    const availableCredits = userCredits?.available_credits || 0;

    return res.status(200).json({
      success: true,
      valid: hasCredits,
      credits: {
        available: availableCredits,
        required: requiredCredits,
        sufficient: hasCredits
      },
      action: action,
      message: hasCredits 
        ? `Sufficient credits available for ${action}` 
        : `Insufficient credits for ${action}. Required: ${requiredCredits}, Available: ${availableCredits}`
    });

  } catch (error) {
    console.error('Error in validate credits API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
