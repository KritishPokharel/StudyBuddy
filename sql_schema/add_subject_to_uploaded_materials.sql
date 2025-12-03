-- Add subject column to uploaded_materials table
-- This stores the AI-extracted subject/category from uploaded materials

ALTER TABLE uploaded_materials
ADD COLUMN IF NOT EXISTS subject TEXT;

-- Add index for faster queries by subject
CREATE INDEX IF NOT EXISTS idx_uploaded_materials_subject ON uploaded_materials(subject);

-- Add comment
COMMENT ON COLUMN uploaded_materials.subject IS 'AI-extracted subject/category of the uploaded material (e.g., "Data Structures & Algorithms", "Chemistry", "Physics")';

