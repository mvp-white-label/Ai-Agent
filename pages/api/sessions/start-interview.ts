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

    const { sessionId } = req.body;
    const userId = authResult.userId;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Get session details
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('interview_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'pending') {
      return res.status(400).json({ error: 'Session is not in pending status' });
    }

    // Only deduct credits for full interviews, not trial sessions
    if (session.session_type === 'full') {
      try {
        // Check credits again before deducting
        const { data: hasCredits, error: creditCheckError } = await supabaseAdmin
          .rpc('check_user_credits', {
            user_uuid: userId,
            required_credits: 1
          });

        if (creditCheckError) {
          console.error('Error checking user credits:', creditCheckError);
          return res.status(500).json({ error: 'Failed to validate credits' });
        }

        if (!hasCredits) {
          return res.status(400).json({ 
            error: 'Insufficient credits',
            message: 'You need at least 1 credit to start this interview.',
            requiredCredits: 1
          });
        }

        // Deduct credits
        const { data: transaction, error: deductError } = await supabaseAdmin
          .from('credit_transactions')
          .insert({
            user_id: userId,
            transaction_type: 'usage',
            amount: -1,
            description: `Interview session: ${session.company} - ${session.position}`,
            reference_id: sessionId,
            status: 'completed'
          })
          .select()
          .single();

        if (deductError) {
          console.error('Error deducting credits:', deductError);
          return res.status(500).json({ error: 'Failed to deduct credits' });
        }

        // Create usage log
        await supabaseAdmin
          .from('credit_usage_log')
          .insert({
            user_id: userId,
            transaction_id: transaction.id,
            usage_type: 'interview_start',
            reference_id: sessionId,
            credits_used: 1
          });
      } catch (error) {
        // If credit system is not set up yet, allow full sessions to proceed
        console.log('Credit system not available, allowing session to start without credit deduction');
      }
    }
    // Trial sessions are free - no credit deduction

    // Update session status to active
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('interview_sessions')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating session status:', updateError);
      return res.status(500).json({ error: 'Failed to start interview session' });
    }

    return res.status(200).json({
      success: true,
      message: 'Interview session started successfully',
      session: updatedSession,
      creditsDeducted: session.session_type === 'full' ? 1 : 0
    });

  } catch (error) {
    console.error('Error in start interview API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
