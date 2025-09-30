-- =============================================
-- Billing and Subscriptions Table Schema
-- =============================================
-- This table stores billing information and subscription data

-- Create billing_subscriptions table
CREATE TABLE IF NOT EXISTS billing_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_name VARCHAR(100) NOT NULL DEFAULT 'free',
    plan_type VARCHAR(50) NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'trial', 'pro', 'enterprise')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'suspended')),
    credits_remaining INTEGER DEFAULT 0,
    credits_used INTEGER DEFAULT 0,
    subscription_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    next_billing_date TIMESTAMP WITH TIME ZONE,
    amount DECIMAL(10,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_billing_user_id ON billing_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_status ON billing_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_billing_plan_type ON billing_subscriptions(plan_type);
CREATE INDEX IF NOT EXISTS idx_billing_stripe_customer ON billing_subscriptions(stripe_customer_id);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_billing_updated_at 
    BEFORE UPDATE ON billing_subscriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own billing" ON billing_subscriptions
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage all billing" ON billing_subscriptions
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON billing_subscriptions TO service_role;
GRANT SELECT ON billing_subscriptions TO authenticated;

-- Comments for documentation
COMMENT ON TABLE billing_subscriptions IS 'Stores user billing and subscription information';
COMMENT ON COLUMN billing_subscriptions.id IS 'Unique identifier for the billing record';
COMMENT ON COLUMN billing_subscriptions.user_id IS 'Foreign key reference to users table';
COMMENT ON COLUMN billing_subscriptions.plan_name IS 'Name of the subscription plan';
COMMENT ON COLUMN billing_subscriptions.plan_type IS 'Type of plan: free, trial, pro, enterprise';
COMMENT ON COLUMN billing_subscriptions.status IS 'Current status of the subscription';
COMMENT ON COLUMN billing_subscriptions.credits_remaining IS 'Number of interview credits remaining';
COMMENT ON COLUMN billing_subscriptions.credits_used IS 'Number of credits used';
COMMENT ON COLUMN billing_subscriptions.amount IS 'Subscription amount in decimal format';
COMMENT ON COLUMN billing_subscriptions.currency IS 'Currency code (ISO 4217)';
COMMENT ON COLUMN billing_subscriptions.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN billing_subscriptions.stripe_subscription_id IS 'Stripe subscription ID';
