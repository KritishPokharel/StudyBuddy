-- Add new fields to midterm_analyses table for storing resources and stats
ALTER TABLE midterm_analyses
ADD COLUMN IF NOT EXISTS recommended_resources JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS error_topics TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS total_errors INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS correct_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS wrong_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS partially_correct_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_marks_received INTEGER,
ADD COLUMN IF NOT EXISTS total_marks_possible INTEGER;

-- Add index on error_topics for faster queries
CREATE INDEX IF NOT EXISTS idx_midterm_analyses_error_topics ON midterm_analyses USING GIN(error_topics);

-- Add comment for documentation
COMMENT ON COLUMN midterm_analyses.recommended_resources IS 'Array of recommended study resources from Perplexity';
COMMENT ON COLUMN midterm_analyses.error_topics IS 'List of topics where errors were found';
COMMENT ON COLUMN midterm_analyses.total_errors IS 'Total number of errors found';
COMMENT ON COLUMN midterm_analyses.correct_count IS 'Number of correct answers';
COMMENT ON COLUMN midterm_analyses.wrong_count IS 'Number of incorrect answers';
COMMENT ON COLUMN midterm_analyses.partially_correct_count IS 'Number of partially correct answers';

