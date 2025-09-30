-- =============================================
-- Supabase Database Schema - Legacy Version
-- =============================================
-- This file is kept for backward compatibility
-- For new installations, use the modular schema files in database/schemas/

-- IMPORTANT: This file is deprecated. Use the modular schema approach instead.
-- See database/schemas/ directory for individual table schemas.

-- =============================================
-- Migration Notice
-- =============================================
/*
The database schema has been modularized for better organization and maintenance.

New Schema Structure:
- database/schemas/00_functions_and_triggers.sql
- database/schemas/01_users.sql
- database/schemas/02_interview_sessions.sql
- database/schemas/03_user_settings.sql
- database/schemas/04_billing_subscriptions.sql
- database/schemas/05_audit_logs.sql
- database/schemas/99_main_schema.sql

To set up the database:
1. Run the schema files in order (00, 01, 02, 03, 04, 05)
2. Or use the main schema file (99_main_schema.sql)

This legacy file is kept for existing installations.
*/

-- =============================================
-- Legacy Schema (Deprecated)
-- =============================================

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create interview_sessions table
CREATE TABLE IF NOT EXISTS interview_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_type VARCHAR(50) NOT NULL,
    company VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    ai_usage INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_approved ON users(approved);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON interview_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON interview_sessions(created_at);

-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Service role can manage all users" ON users
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can read own sessions" ON interview_sessions
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage all sessions" ON interview_sessions
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON users TO service_role;
GRANT SELECT ON users TO authenticated;
GRANT INSERT ON users TO service_role;
GRANT UPDATE ON users TO service_role;
GRANT DELETE ON users TO service_role;

GRANT ALL ON interview_sessions TO service_role;
GRANT SELECT ON interview_sessions TO authenticated;
GRANT INSERT ON interview_sessions TO service_role;
GRANT UPDATE ON interview_sessions TO service_role;
GRANT DELETE ON interview_sessions TO service_role;
