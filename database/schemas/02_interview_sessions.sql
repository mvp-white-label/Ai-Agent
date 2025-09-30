-- =============================================
-- Interview Sessions Table Schema
-- =============================================
-- This table stores interview session data for the ParakeetAI application

-- Create interview_sessions table
CREATE TABLE IF NOT EXISTS interview_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_type VARCHAR(50) NOT NULL CHECK (session_type IN ('trial', 'full')),
    company VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
    language VARCHAR(50) DEFAULT 'English',
    ai_model VARCHAR(100) DEFAULT 'Gemini 2.0 Flash',
    extra_context TEXT,
    resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'paused')),
    ai_usage INTEGER DEFAULT 0 CHECK (ai_usage >= 0 AND ai_usage <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    session_data JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON interview_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON interview_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_session_type ON interview_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_sessions_company ON interview_sessions(company);
CREATE INDEX IF NOT EXISTS idx_sessions_position ON interview_sessions(position);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON interview_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own sessions" ON interview_sessions
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own sessions" ON interview_sessions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own sessions" ON interview_sessions
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own sessions" ON interview_sessions
    FOR DELETE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage all sessions" ON interview_sessions
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON interview_sessions TO service_role;
GRANT SELECT ON interview_sessions TO authenticated;
GRANT INSERT ON interview_sessions TO authenticated;
GRANT UPDATE ON interview_sessions TO authenticated;
GRANT DELETE ON interview_sessions TO authenticated;

-- Comments for documentation
COMMENT ON TABLE interview_sessions IS 'Stores interview session data and progress';
COMMENT ON COLUMN interview_sessions.id IS 'Unique identifier for the session';
COMMENT ON COLUMN interview_sessions.user_id IS 'Foreign key reference to users table';
COMMENT ON COLUMN interview_sessions.session_type IS 'Type of session: trial or full';
COMMENT ON COLUMN interview_sessions.company IS 'Company name for the interview';
COMMENT ON COLUMN interview_sessions.position IS 'Job position being interviewed for';
COMMENT ON COLUMN interview_sessions.duration_minutes IS 'Duration of the session in minutes';
COMMENT ON COLUMN interview_sessions.language IS 'Language for the interview (e.g., English, Spanish)';
COMMENT ON COLUMN interview_sessions.ai_model IS 'AI model used for the interview (e.g., Gemini 2.0 Flash)';
COMMENT ON COLUMN interview_sessions.extra_context IS 'Additional context or instructions for the interview';
COMMENT ON COLUMN interview_sessions.resume_id IS 'Foreign key reference to resumes table (optional)';
COMMENT ON COLUMN interview_sessions.status IS 'Current status of the session';
COMMENT ON COLUMN interview_sessions.ai_usage IS 'Percentage of AI assistance used (0-100)';
COMMENT ON COLUMN interview_sessions.created_at IS 'Timestamp when session was created';
COMMENT ON COLUMN interview_sessions.updated_at IS 'Timestamp when session was last updated';
COMMENT ON COLUMN interview_sessions.ended_at IS 'Timestamp when session ended';
COMMENT ON COLUMN interview_sessions.started_at IS 'Timestamp when session actually started';
COMMENT ON COLUMN interview_sessions.session_data IS 'Additional session data in JSON format';
