-- =============================================
-- Resume Parsed Data Table Schema
-- =============================================
-- This table stores AI-parsed content from resume files

-- Create resume_parsed_data table
CREATE TABLE IF NOT EXISTS resume_parsed_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    parsed_skills TEXT[],
    parsed_experience JSONB,
    parsed_education JSONB,
    parsed_certifications JSONB,
    parsed_projects JSONB,
    parsed_summary TEXT,
    suggested_questions JSONB,
    ai_model_used VARCHAR(100) DEFAULT 'gemini-2.5-flash',
    parsing_status VARCHAR(50) DEFAULT 'pending',
    parsing_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_resume_parsed_data_resume_id ON resume_parsed_data(resume_id);
CREATE INDEX IF NOT EXISTS idx_resume_parsed_data_status ON resume_parsed_data(parsing_status);
CREATE INDEX IF NOT EXISTS idx_resume_parsed_data_created_at ON resume_parsed_data(created_at);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_resume_parsed_data_updated_at 
    BEFORE UPDATE ON resume_parsed_data 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE resume_parsed_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own parsed resume data" ON resume_parsed_data
    FOR SELECT USING (
        resume_id IN (
            SELECT id FROM resumes WHERE user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Users can insert own parsed resume data" ON resume_parsed_data
    FOR INSERT WITH CHECK (
        resume_id IN (
            SELECT id FROM resumes WHERE user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Users can update own parsed resume data" ON resume_parsed_data
    FOR UPDATE USING (
        resume_id IN (
            SELECT id FROM resumes WHERE user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Users can delete own parsed resume data" ON resume_parsed_data
    FOR DELETE USING (
        resume_id IN (
            SELECT id FROM resumes WHERE user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Service role can manage all parsed resume data" ON resume_parsed_data
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON resume_parsed_data TO service_role;
GRANT SELECT ON resume_parsed_data TO authenticated;
GRANT INSERT ON resume_parsed_data TO authenticated;
GRANT UPDATE ON resume_parsed_data TO authenticated;
GRANT DELETE ON resume_parsed_data TO authenticated;

-- Comments for documentation
COMMENT ON TABLE resume_parsed_data IS 'Stores AI-parsed content from resume files';
COMMENT ON COLUMN resume_parsed_data.id IS 'Unique identifier for the parsed data record';
COMMENT ON COLUMN resume_parsed_data.resume_id IS 'Foreign key reference to resumes table';
COMMENT ON COLUMN resume_parsed_data.parsed_skills IS 'Array of skills extracted from resume';
COMMENT ON COLUMN resume_parsed_data.parsed_experience IS 'JSON object containing work experience data';
COMMENT ON COLUMN resume_parsed_data.parsed_education IS 'JSON object containing education data';
COMMENT ON COLUMN resume_parsed_data.parsed_projects IS 'JSON object containing projects data';
COMMENT ON COLUMN resume_parsed_data.parsed_summary IS 'AI-generated summary of the resume';
COMMENT ON COLUMN resume_parsed_data.suggested_questions IS 'Array of interview questions based on parsed skills';
COMMENT ON COLUMN resume_parsed_data.ai_model_used IS 'AI model used for parsing (e.g., gemini-2.5-flash)';
COMMENT ON COLUMN resume_parsed_data.parsing_status IS 'Status of parsing: pending, completed, failed';
COMMENT ON COLUMN resume_parsed_data.parsing_error IS 'Error message if parsing failed';
