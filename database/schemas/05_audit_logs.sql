-- =============================================
-- Audit Logs Table Schema
-- =============================================
-- This table stores audit logs for tracking user actions and system events

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_session_id ON audit_logs(session_id);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own audit logs" ON audit_logs
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage all audit logs" ON audit_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON audit_logs TO service_role;
GRANT SELECT ON audit_logs TO authenticated;

-- Comments for documentation
COMMENT ON TABLE audit_logs IS 'Stores audit logs for tracking user actions and system events';
COMMENT ON COLUMN audit_logs.id IS 'Unique identifier for the audit log entry';
COMMENT ON COLUMN audit_logs.user_id IS 'Foreign key reference to users table (nullable for system events)';
COMMENT ON COLUMN audit_logs.action IS 'Action performed (CREATE, UPDATE, DELETE, LOGIN, etc.)';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource affected (user, session, etc.)';
COMMENT ON COLUMN audit_logs.resource_id IS 'ID of the resource affected';
COMMENT ON COLUMN audit_logs.old_values IS 'Previous values before the action (JSON)';
COMMENT ON COLUMN audit_logs.new_values IS 'New values after the action (JSON)';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the user performing the action';
COMMENT ON COLUMN audit_logs.user_agent IS 'User agent string from the request';
COMMENT ON COLUMN audit_logs.session_id IS 'Session ID for tracking related actions';
COMMENT ON COLUMN audit_logs.created_at IS 'Timestamp when the audit log was created';
