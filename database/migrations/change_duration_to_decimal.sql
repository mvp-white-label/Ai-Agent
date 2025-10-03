-- Change duration_minutes column from INTEGER to DECIMAL to support decimal values
-- This allows storing precise durations like 1.65 minutes instead of just whole minutes

-- First, drop the existing constraint
ALTER TABLE interview_sessions DROP CONSTRAINT IF EXISTS interview_sessions_duration_minutes_check;

-- Change the column type from INTEGER to DECIMAL(10,2) to support 2 decimal places
ALTER TABLE interview_sessions ALTER COLUMN duration_minutes TYPE DECIMAL(10,2) USING duration_minutes::DECIMAL(10,2);

-- Add the new constraint that allows decimal values
ALTER TABLE interview_sessions ADD CONSTRAINT interview_sessions_duration_minutes_check 
    CHECK (duration_minutes >= 0 AND duration_minutes <= 100);
