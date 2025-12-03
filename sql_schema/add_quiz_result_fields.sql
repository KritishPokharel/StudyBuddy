-- Add new fields to quiz_results table for storing quiz metadata
-- This allows displaying quiz results even when the quiz itself isn't in the database

ALTER TABLE quiz_results 
ADD COLUMN IF NOT EXISTS time_spent INTEGER, -- Time spent in seconds
ADD COLUMN IF NOT EXISTS quiz_title TEXT, -- Quiz title (for display when quiz doesn't exist)
ADD COLUMN IF NOT EXISTS quiz_topics TEXT[]; -- Quiz topics (for display when quiz doesn't exist)

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_quiz_results_completed_at_desc ON quiz_results(completed_at DESC);

