import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseClient';
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
    const { trigger, metadata = {} } = req.body;

    if (!trigger) {
      return res.status(400).json({ error: 'Trigger is required' });
    }

    // Get all active credit rules
    const { data: rules, error: rulesError } = await supabaseAdmin
      .from('credit_rules')
      .select('*')
      .eq('is_active', true)
      .lte('valid_from', new Date().toISOString())
      .or(`valid_until.is.null,valid_until.gt.${new Date().toISOString()}`);

    if (rulesError) {
      console.error('Error fetching credit rules:', rulesError);
      return res.status(500).json({ error: 'Failed to fetch credit rules' });
    }

    const allocatedCredits = [];
    const errors = [];

    for (const rule of rules || []) {
      try {
        // Check if rule matches the trigger
        const conditions = rule.conditions || {};
        if (conditions.trigger !== trigger) {
          continue;
        }

        // Check additional conditions
        if (conditions.min_interval_hours) {
          const lastAllocation = await supabaseAdmin
            .from('credit_transactions')
            .select('created_at')
            .eq('user_id', userId)
            .eq('transaction_type', 'bonus')
            .like('description', `%${rule.rule_name}%`)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (lastAllocation.data) {
            const lastTime = new Date(lastAllocation.data.created_at);
            const now = new Date();
            const hoursDiff = (now.getTime() - lastTime.getTime()) / (1000 * 60 * 60);
            
            if (hoursDiff < conditions.min_interval_hours) {
              continue;
            }
          }
        }

        // Check max uses per user
        if (rule.max_uses_per_user) {
          const { count } = await supabaseAdmin
            .from('credit_transactions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('transaction_type', 'bonus')
            .like('description', `%${rule.rule_name}%`);

          if (count && count >= rule.max_uses_per_user) {
            continue;
          }
        }

        // Allocate credits using the database function
        const { data: allocated, error: allocateError } = await supabaseAdmin
          .rpc('allocate_credits_by_rule', {
            user_uuid: userId,
            rule_name_param: rule.rule_name
          });

        if (allocateError) {
          console.error(`Error allocating credits for rule ${rule.rule_name}:`, allocateError);
          errors.push(`Failed to allocate credits for ${rule.rule_name}`);
          continue;
        }

        if (allocated) {
          allocatedCredits.push({
            rule: rule.rule_name,
            amount: rule.credit_amount,
            type: rule.rule_type
          });
        }
      } catch (error) {
        console.error(`Error processing rule ${rule.rule_name}:`, error);
        errors.push(`Error processing ${rule.rule_name}`);
      }
    }

    // Get updated credit balance
    const { data: userCredits, error: creditsError } = await supabaseAdmin
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (creditsError) {
      console.error('Error fetching updated credits:', creditsError);
    }

    return res.status(200).json({
      success: true,
      message: 'Credit allocation completed',
      allocatedCredits,
      errors: errors.length > 0 ? errors : undefined,
      currentCredits: userCredits ? {
        total: userCredits.total_credits,
        used: userCredits.used_credits,
        available: userCredits.available_credits
      } : null
    });

  } catch (error) {
    console.error('Error in auto-allocate credits API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
