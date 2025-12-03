-- Add fields to quiz_results table to store complete summary information
-- This allows users to see a quick recap on the dashboard

ALTER TABLE quiz_results 
ADD COLUMN IF NOT EXISTS correct_count INTEGER, -- Number of correct answers
ADD COLUMN IF NOT EXISTS wrong_count INTEGER, -- Number of wrong answers
ADD COLUMN IF NOT EXISTS total_questions INTEGER, -- Total number of questions
ADD COLUMN IF NOT EXISTS weak_areas JSONB, -- Array of weak areas with accuracy: [{topic: string, accuracy: number}]
ADD COLUMN IF NOT EXISTS recommended_resources JSONB; -- Array of recommended resources: [{title: string, url: string, description: string}]

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_quiz_results_score ON quiz_results(score DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_results_completed_at_desc ON quiz_results(completed_at DESC);

