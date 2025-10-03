-- =============================================
-- Main Database Schema
-- =============================================
-- This is the main schema file that imports all table schemas
-- Run this file to set up the complete database structure

-- Note: Run the schemas in this order:
-- 1. 00_functions_and_triggers.sql
-- 2. 01_users.sql
-- 3. 02_interview_sessions.sql
-- 4. 03_user_settings.sql
-- 5. 04_billing_subscriptions.sql
-- 6. 05_audit_logs.sql
-- 7. 06_resumes.sql
-- 8. 07_resume_parsed_data.sql
-- 9. 08_user_credits.sql

-- =============================================
-- Database Setup Instructions
-- =============================================
/*
To set up the complete database schema:

1. Run the files in this order in your Supabase SQL editor:
   - 00_functions_and_triggers.sql
   - 01_users.sql
   - 02_interview_sessions.sql
   - 03_user_settings.sql
   - 04_billing_subscriptions.sql
   - 05_audit_logs.sql
   - 06_resumes.sql
   - 07_resume_parsed_data.sql
   - 08_user_credits.sql

2. Or run this main file which includes all schemas (if your SQL editor supports includes)

3. Verify the setup by checking:
   - All tables are created
   - Indexes are in place
   - RLS policies are active
   - Triggers are working

4. Test with sample data:
   - Create a test user
   - Verify settings and billing records are auto-created
   - Create an interview session
   - Check audit logs are generated
*/

-- =============================================
-- Schema Summary
-- =============================================
/*
Tables Created:
1. users - User account information
2. interview_sessions - Interview session data
3. user_settings - User preferences and settings
4. billing_subscriptions - Billing and subscription data
5. audit_logs - System audit trail
6. resumes - User uploaded resumes
7. resume_parsed_data - Parsed resume information
8. user_credits - User credit balance and management
9. credit_transactions - Credit transaction history
10. credit_rules - Automatic credit allocation rules
11. credit_usage_log - Detailed credit usage tracking

Key Features:
- Row Level Security (RLS) enabled on all tables
- Automatic timestamp updates
- Audit logging for all changes
- Proper foreign key relationships
- Performance-optimized indexes
- JSONB columns for flexible data storage
- Check constraints for data validation
*/

-- =============================================
-- Sample Data (Optional)
-- =============================================
-- Uncomment the following lines to insert sample data for testing

/*
-- Insert sample admin user
INSERT INTO users (email, name, password_hash, approved) 
VALUES (
    'admin@parakeetai.com', 
    'Admin User', 
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2a', -- password: admin123
    true
);

-- Insert sample regular user
INSERT INTO users (email, name, password_hash, approved) 
VALUES (
    'user@example.com', 
    'Test User', 
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2a', -- password: admin123
    false
);
*/
