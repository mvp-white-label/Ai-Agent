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
    const { page = 1, limit = 20, type = 'all' } = req.body;

    const pageNum = parseInt(page.toString());
    const limitNum = parseInt(limit.toString());
    const offset = (pageNum - 1) * limitNum;

    // Build query
    let query = supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    // Filter by transaction type if specified
    if (type && type !== 'all') {
      query = query.eq('transaction_type', type);
    }

    const { data: transactions, error: transactionsError } = await query;

    if (transactionsError) {
      console.error('Error fetching credit history:', transactionsError);
      return res.status(500).json({ error: 'Failed to fetch credit history' });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('credit_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (type && type !== 'all') {
      countQuery = countQuery.eq('transaction_type', type);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error fetching transaction count:', countError);
      return res.status(500).json({ error: 'Failed to fetch transaction count' });
    }

    // Get current credit balance
    const { data: userCredits, error: creditsError } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (creditsError && creditsError.code !== 'PGRST116') {
      console.error('Error fetching user credits:', creditsError);
      return res.status(500).json({ error: 'Failed to fetch current credits' });
    }

    return res.status(200).json({
      success: true,
      transactions: transactions || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      },
      currentCredits: userCredits ? {
        total: userCredits.total_credits,
        used: userCredits.used_credits,
        available: userCredits.available_credits
      } : {
        total: 0,
        used: 0,
        available: 0
      }
    });

  } catch (error) {
    console.error('Error in credit history API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
