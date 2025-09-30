-- =============================================
-- User Settings Table Schema
-- =============================================
-- This table stores user preferences and settings

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notifications JSONB DEFAULT '{
        "email": true,
        "push": false,
        "sms": false
    }'::jsonb,
    privacy JSONB DEFAULT '{
        "profile_visibility": "private",
        "data_sharing": false
    }'::jsonb,
    preferences JSONB DEFAULT '{
        "theme": "light",
        "language": "en",
        "timezone": "UTC"
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON user_settings(user_id);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_settings_updated_at 
    BEFORE UPDATE ON user_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own settings" ON user_settings
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own settings" ON user_settings
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own settings" ON user_settings
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage all settings" ON user_settings
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON user_settings TO service_role;
GRANT SELECT ON user_settings TO authenticated;
GRANT INSERT ON user_settings TO authenticated;
GRANT UPDATE ON user_settings TO authenticated;

-- Comments for documentation
COMMENT ON TABLE user_settings IS 'Stores user preferences and application settings';
COMMENT ON COLUMN user_settings.id IS 'Unique identifier for the settings record';
COMMENT ON COLUMN user_settings.user_id IS 'Foreign key reference to users table';
COMMENT ON COLUMN user_settings.notifications IS 'Notification preferences in JSON format';
COMMENT ON COLUMN user_settings.privacy IS 'Privacy settings in JSON format';
COMMENT ON COLUMN user_settings.preferences IS 'User preferences in JSON format';
COMMENT ON COLUMN user_settings.created_at IS 'Timestamp when settings were created';
COMMENT ON COLUMN user_settings.updated_at IS 'Timestamp when settings were last updated';
