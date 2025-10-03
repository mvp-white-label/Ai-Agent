-- Add 'pending' status to interview_sessions table
-- This allows sessions to be created in pending state before they actually start

-- First, drop the existing constraint
ALTER TABLE interview_sessions DROP CONSTRAINT IF EXISTS interview_sessions_status_check;

-- Add the new constraint with 'pending' status
ALTER TABLE interview_sessions ADD CONSTRAINT interview_sessions_status_check 
    CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'paused'));

-- Update the default status to 'pending' for new sessions
ALTER TABLE interview_sessions ALTER COLUMN status SET DEFAULT 'pending';
