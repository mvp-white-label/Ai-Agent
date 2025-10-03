-- Fix duration_minutes constraint to allow 0 for pending sessions
-- This allows sessions to start with 0 duration and be calculated when completed

-- Drop the existing constraint
ALTER TABLE interview_sessions DROP CONSTRAINT IF EXISTS interview_sessions_duration_minutes_check;

-- Add the new constraint that allows 0 for pending sessions
ALTER TABLE interview_sessions ADD CONSTRAINT interview_sessions_duration_minutes_check 
    CHECK (duration_minutes >= 0 AND duration_minutes <= 100);
