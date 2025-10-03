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
    const { amount, description, referenceId, usageType = 'interview_start' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Check if user has enough credits
    const { data: userCredits, error: creditsError } = await supabase
      .from('user_credits')
      .select('available_credits')
      .eq('user_id', userId)
      .single();

    if (creditsError) {
      console.error('Error fetching user credits:', creditsError);
      return res.status(500).json({ error: 'Failed to check credits' });
    }

    const availableCredits = userCredits?.available_credits || 0;
    if (availableCredits < amount) {
      return res.status(400).json({ 
        error: 'Insufficient credits',
        available: availableCredits,
        required: amount
      });
    }

    // Create credit deduction transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'usage',
        amount: -amount, // Negative amount for deduction
        description: description || `Credit usage: ${usageType}`,
        reference_id: referenceId,
        status: 'completed'
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Error creating credit transaction:', transactionError);
      return res.status(500).json({ error: 'Failed to deduct credits' });
    }

    // Create usage log entry
    const { error: usageLogError } = await supabase
      .from('credit_usage_log')
      .insert({
        user_id: userId,
        transaction_id: transaction.id,
        usage_type: usageType,
        reference_id: referenceId,
        credits_used: amount
      });

    if (usageLogError) {
      console.error('Error creating usage log:', usageLogError);
      // Don't fail the request, just log the error
    }

    // Get updated credit balance
    const { data: updatedCredits, error: updatedCreditsError } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (updatedCreditsError) {
      console.error('Error fetching updated credits:', updatedCreditsError);
      return res.status(500).json({ error: 'Failed to fetch updated credits' });
    }

    return res.status(200).json({
      success: true,
      message: 'Credits deducted successfully',
      transaction: {
        id: transaction.id,
        amount: -amount,
        description: transaction.description
      },
      credits: {
        total: updatedCredits.total_credits,
        used: updatedCredits.used_credits,
        available: updatedCredits.available_credits
      }
    });

  } catch (error) {
    console.error('Error in deduct credits API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
