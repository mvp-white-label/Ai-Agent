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
    const { ruleName, amount, description, transactionType = 'bonus' } = req.body;

    if (!ruleName && !amount) {
      return res.status(400).json({ error: 'Either ruleName or amount is required' });
    }

    let creditAmount = 0;
    let transactionDescription = description;

    // If ruleName is provided, get credits from rule
    if (ruleName) {
      const { data: rule, error: ruleError } = await supabase
        .from('credit_rules')
        .select('*')
        .eq('rule_name', ruleName)
        .eq('is_active', true)
        .single();

      if (ruleError || !rule) {
        return res.status(400).json({ error: 'Invalid or inactive rule' });
      }

      // Check if rule has usage limits
      if (rule.max_uses_per_user) {
        const { count } = await supabase
          .from('credit_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('transaction_type', 'bonus')
          .like('description', `%${ruleName}%`);

        if (count && count >= rule.max_uses_per_user) {
          return res.status(400).json({ error: 'Rule usage limit exceeded' });
        }
      }

      creditAmount = rule.credit_amount;
      transactionDescription = transactionDescription || `Automatic credit allocation: ${ruleName}`;
    } else {
      // Direct amount allocation
      creditAmount = amount;
      transactionDescription = transactionDescription || 'Manual credit allocation';
    }

    if (creditAmount <= 0) {
      return res.status(400).json({ error: 'Credit amount must be positive' });
    }

    // Create credit transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        transaction_type: transactionType,
        amount: creditAmount,
        description: transactionDescription,
        status: 'completed'
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Error creating credit transaction:', transactionError);
      return res.status(500).json({ error: 'Failed to allocate credits' });
    }

    // Get updated credit balance
    const { data: userCredits, error: creditsError } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (creditsError) {
      console.error('Error fetching updated credits:', creditsError);
      return res.status(500).json({ error: 'Failed to fetch updated credits' });
    }

    return res.status(200).json({
      success: true,
      message: 'Credits allocated successfully',
      transaction: {
        id: transaction.id,
        amount: creditAmount,
        description: transactionDescription
      },
      credits: {
        total: userCredits.total_credits,
        used: userCredits.used_credits,
        available: userCredits.available_credits
      }
    });

  } catch (error) {
    console.error('Error in allocate credits API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
