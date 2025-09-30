-- =============================================
-- Resumes Table Schema
-- =============================================
-- This table stores user resume/CV files and metadata

-- Create resumes table
CREATE TABLE IF NOT EXISTS resumes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_created_at ON resumes(created_at);
CREATE INDEX IF NOT EXISTS idx_resumes_file_type ON resumes(file_type);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_resumes_updated_at 
    BEFORE UPDATE ON resumes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own resumes" ON resumes
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own resumes" ON resumes
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own resumes" ON resumes
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own resumes" ON resumes
    FOR DELETE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage all resumes" ON resumes
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON resumes TO service_role;
GRANT SELECT ON resumes TO authenticated;
GRANT INSERT ON resumes TO authenticated;
GRANT UPDATE ON resumes TO authenticated;
GRANT DELETE ON resumes TO authenticated;

-- Comments for documentation
COMMENT ON TABLE resumes IS 'Stores user resume/CV files and metadata';
COMMENT ON COLUMN resumes.id IS 'Unique identifier for the resume record';
COMMENT ON COLUMN resumes.user_id IS 'Foreign key reference to users table';
COMMENT ON COLUMN resumes.title IS 'Display title for the resume';
COMMENT ON COLUMN resumes.filename IS 'Original filename of the uploaded file';
COMMENT ON COLUMN resumes.file_path IS 'Path to the file in Supabase Storage';
COMMENT ON COLUMN resumes.file_size IS 'Size of the file in bytes';
COMMENT ON COLUMN resumes.file_type IS 'MIME type of the file';
COMMENT ON COLUMN resumes.created_at IS 'Timestamp when resume was uploaded';
COMMENT ON COLUMN resumes.updated_at IS 'Timestamp when resume was last updated';
