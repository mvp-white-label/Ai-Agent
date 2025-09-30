-- =============================================
-- Common Functions and Triggers
-- =============================================
-- This file contains shared functions and triggers used across all tables

-- Create function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create function to generate audit log entries
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    action_type VARCHAR(100);
    old_data JSONB;
    new_data JSONB;
BEGIN
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        action_type := 'CREATE';
        old_data := NULL;
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'UPDATE';
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'DELETE';
        old_data := to_jsonb(OLD);
        new_data := NULL;
    END IF;

    -- Insert audit log
    INSERT INTO audit_logs (
        user_id,
        action,
        resource_type,
        resource_id,
        old_values,
        new_values,
        created_at
    ) VALUES (
        COALESCE(NEW.user_id, OLD.user_id),
        action_type,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        old_data,
        new_data,
        NOW()
    );

    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ language 'plpgsql';

-- Create function to automatically create user settings when user is created
CREATE OR REPLACE FUNCTION create_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_settings (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create function to automatically create billing record when user is created
CREATE OR REPLACE FUNCTION create_user_billing()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO billing_subscriptions (user_id, plan_type, status) 
    VALUES (NEW.id, 'free', 'active');
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Comments for documentation
COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates the updated_at column when a record is modified';
COMMENT ON FUNCTION create_audit_log() IS 'Creates audit log entries for tracking changes to records';
COMMENT ON FUNCTION create_user_settings() IS 'Automatically creates user settings when a new user is created';
COMMENT ON FUNCTION create_user_billing() IS 'Automatically creates billing record when a new user is created';
