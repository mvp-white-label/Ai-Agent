-- User Credits Management Schema
-- This schema handles dynamic credit allocation and tracking for interview access

-- User Credits Table - Stores current credit balance for each user
CREATE TABLE IF NOT EXISTS user_credits (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_credits INTEGER NOT NULL DEFAULT 0,
    used_credits INTEGER NOT NULL DEFAULT 0,
    available_credits INTEGER GENERATED ALWAYS AS (total_credits - used_credits) STORED,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit Transactions Table - Tracks all credit changes
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('purchase', 'bonus', 'refund', 'usage', 'expiration', 'admin_adjustment')),
    amount INTEGER NOT NULL, -- Positive for credits added, negative for credits used
    description TEXT,
    reference_id UUID, -- Reference to subscription, interview session, etc.
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    expires_at TIMESTAMP WITH TIME ZONE, -- For credits that expire
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id) -- Admin who made the change
);

-- Credit Rules Table - Defines automatic credit allocation rules
CREATE TABLE IF NOT EXISTS credit_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(100) NOT NULL UNIQUE,
    rule_type VARCHAR(30) NOT NULL CHECK (rule_type IN ('signup_bonus', 'daily_bonus', 'subscription_bonus', 'referral_bonus', 'admin_bonus')),
    credit_amount INTEGER NOT NULL,
    conditions JSONB, -- Flexible conditions for complex rules
    is_active BOOLEAN NOT NULL DEFAULT true,
    max_uses_per_user INTEGER, -- NULL means unlimited
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Credit Usage Log - Detailed log of how credits are used
CREATE TABLE IF NOT EXISTS credit_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES credit_transactions(id) ON DELETE CASCADE,
    usage_type VARCHAR(30) NOT NULL CHECK (usage_type IN ('interview_start', 'interview_complete', 'ai_generation', 'premium_feature')),
    reference_id UUID, -- Interview session ID, etc.
    credits_used INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_rules_active ON credit_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_credit_usage_log_user_id ON credit_usage_log(user_id);

-- Function to automatically update user credits when transactions are added
CREATE OR REPLACE FUNCTION update_user_credits()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user_credits table
    INSERT INTO user_credits (user_id, total_credits, used_credits, last_updated)
    VALUES (
        NEW.user_id,
        CASE 
            WHEN NEW.transaction_type IN ('purchase', 'bonus', 'refund', 'admin_adjustment') 
            THEN NEW.amount 
            ELSE 0 
        END,
        CASE 
            WHEN NEW.transaction_type = 'usage' 
            THEN ABS(NEW.amount) 
            ELSE 0 
        END,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_credits = user_credits.total_credits + 
            CASE 
                WHEN NEW.transaction_type IN ('purchase', 'bonus', 'refund', 'admin_adjustment') 
                THEN NEW.amount 
                ELSE 0 
            END,
        used_credits = user_credits.used_credits + 
            CASE 
                WHEN NEW.transaction_type = 'usage' 
                THEN ABS(NEW.amount) 
                ELSE 0 
            END,
        last_updated = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update credits
CREATE TRIGGER trigger_update_user_credits
    AFTER INSERT ON credit_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_credits();

-- Function to check if user has enough credits
CREATE OR REPLACE FUNCTION check_user_credits(user_uuid UUID, required_credits INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    available INTEGER;
BEGIN
    SELECT available_credits INTO available
    FROM user_credits
    WHERE user_id = user_uuid;
    
    RETURN COALESCE(available, 0) >= required_credits;
END;
$$ LANGUAGE plpgsql;

-- Function to allocate credits based on rules
CREATE OR REPLACE FUNCTION allocate_credits_by_rule(user_uuid UUID, rule_name_param VARCHAR(100))
RETURNS BOOLEAN AS $$
DECLARE
    rule_record credit_rules%ROWTYPE;
    usage_count INTEGER;
BEGIN
    -- Get the rule
    SELECT * INTO rule_record
    FROM credit_rules
    WHERE rule_name = rule_name_param AND is_active = true
    AND (valid_until IS NULL OR valid_until > NOW());
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check max uses per user if specified
    IF rule_record.max_uses_per_user IS NOT NULL THEN
        SELECT COUNT(*) INTO usage_count
        FROM credit_transactions
        WHERE user_id = user_uuid 
        AND transaction_type = 'bonus'
        AND description LIKE '%' || rule_name_param || '%';
        
        IF usage_count >= rule_record.max_uses_per_user THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    -- Allocate credits
    INSERT INTO credit_transactions (user_id, transaction_type, amount, description)
    VALUES (user_uuid, 'bonus', rule_record.credit_amount, 
            'Automatic credit allocation: ' || rule_record.rule_name);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Insert default credit rules
INSERT INTO credit_rules (rule_name, rule_type, credit_amount, conditions, max_uses_per_user) VALUES
('welcome_bonus', 'signup_bonus', 5, '{"trigger": "user_signup"}', 1),
('daily_login_bonus', 'daily_bonus', 1, '{"trigger": "daily_login", "min_interval_hours": 24}', 1),
('subscription_monthly_bonus', 'subscription_bonus', 20, '{"trigger": "subscription_renewal", "interval": "monthly"}', NULL)
ON CONFLICT (rule_name) DO NOTHING;
