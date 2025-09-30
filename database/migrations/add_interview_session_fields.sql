-- Migration: Add missing fields to interview_sessions table
-- Run this to add the new fields that were missing

-- Add the missing columns
ALTER TABLE interview_sessions 
ADD COLUMN IF NOT EXISTS language VARCHAR(50) DEFAULT 'English',
ADD COLUMN IF NOT EXISTS ai_model VARCHAR(100) DEFAULT 'Gemini 2.0 Flash',
ADD COLUMN IF NOT EXISTS extra_context TEXT,
ADD COLUMN IF NOT EXISTS resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL;

-- Add comments for the new columns
COMMENT ON COLUMN interview_sessions.language IS 'Language for the interview (e.g., English, Spanish)';
COMMENT ON COLUMN interview_sessions.ai_model IS 'AI model used for the interview (e.g., Gemini 2.0 Flash)';
COMMENT ON COLUMN interview_sessions.extra_context IS 'Additional context or instructions for the interview';
COMMENT ON COLUMN interview_sessions.resume_id IS 'Foreign key reference to resumes table (optional)';
