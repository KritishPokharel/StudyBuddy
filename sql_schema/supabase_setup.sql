-- =====================================================
-- Supabase Database Setup Script
-- Personalized Learning Platform
-- =====================================================
-- This script will:
-- 1. Drop all existing tables (if they exist)
-- 2. Create all required tables
-- 3. Create indexes for performance
-- 4. Set up Row Level Security (RLS) policies
-- =====================================================

-- =====================================================
-- STEP 1: DROP EXISTING TABLES (in reverse dependency order)
-- =====================================================

-- Drop tables that have foreign keys first
DROP TABLE IF EXISTS quiz_results CASCADE;
DROP TABLE IF EXISTS recommended_resources CASCADE;
DROP TABLE IF EXISTS user_weaknesses CASCADE;
DROP TABLE IF EXISTS uploaded_materials CASCADE;
DROP TABLE IF EXISTS midterm_analyses CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;

-- Drop users table last (if not using Supabase Auth)
-- Uncomment if you're not using Supabase Auth
-- DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- STEP 2: CREATE TABLES
-- =====================================================

-- Note: We're using Supabase Auth (auth.users table)
-- No need to create a separate users table
-- All user_id references will use auth.users(id)

-- Table: midterm_analyses
CREATE TABLE midterm_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  course_name TEXT,
  errors JSONB NOT NULL, -- Array of error objects: [{question, yourAnswer, correctAnswer, topic, feedback}]
  extracted_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: quizzes
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  questions JSONB NOT NULL, -- Array of question objects
  topics TEXT[], -- Array of topic strings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: quiz_results
CREATE TABLE quiz_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  score DECIMAL(5,2) NOT NULL, -- Percentage score (0-100)
  answers JSONB NOT NULL, -- Array of answer objects: [{question_id, selected_answer, is_correct}]
  weak_topics TEXT[], -- Topics user struggled with
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: recommended_resources
CREATE TABLE recommended_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  topics TEXT[], -- Topics this resource covers
  source TEXT DEFAULT 'Perplexity', -- Source of recommendation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: user_weaknesses
CREATE TABLE user_weaknesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  error_count INTEGER DEFAULT 0,
  last_encountered TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, topic)
);

-- Table: uploaded_materials
CREATE TABLE uploaded_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT, -- pdf, image, etc.
  file_size BIGINT, -- Size in bytes
  extracted_text TEXT, -- OCR extracted text
  topics TEXT[], -- Extracted topics
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for midterm_analyses
CREATE INDEX idx_midterm_analyses_user_id ON midterm_analyses(user_id);
CREATE INDEX idx_midterm_analyses_created_at ON midterm_analyses(created_at);

-- Indexes for quizzes
CREATE INDEX idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX idx_quizzes_topics ON quizzes USING GIN(topics);

-- Indexes for quiz_results
CREATE INDEX idx_quiz_results_user_id ON quiz_results(user_id);
CREATE INDEX idx_quiz_results_quiz_id ON quiz_results(quiz_id);
CREATE INDEX idx_quiz_results_completed_at ON quiz_results(completed_at);

-- Indexes for recommended_resources
CREATE INDEX idx_recommended_resources_user_id ON recommended_resources(user_id);
CREATE INDEX idx_recommended_resources_topics ON recommended_resources USING GIN(topics);

-- Indexes for user_weaknesses
CREATE INDEX idx_user_weaknesses_user_id ON user_weaknesses(user_id);
CREATE INDEX idx_user_weaknesses_topic ON user_weaknesses(topic);

-- Indexes for uploaded_materials
CREATE INDEX idx_uploaded_materials_user_id ON uploaded_materials(user_id);

-- =====================================================
-- STEP 4: ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE midterm_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommended_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_weaknesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_materials ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 5: CREATE RLS POLICIES
-- =====================================================

-- Policies for midterm_analyses
CREATE POLICY "Users can view own midterm analyses"
  ON midterm_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own midterm analyses"
  ON midterm_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own midterm analyses"
  ON midterm_analyses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own midterm analyses"
  ON midterm_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for quizzes
CREATE POLICY "Users can view own quizzes"
  ON quizzes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quizzes"
  ON quizzes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quizzes"
  ON quizzes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quizzes"
  ON quizzes FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for quiz_results
CREATE POLICY "Users can view own quiz results"
  ON quiz_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz results"
  ON quiz_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quiz results"
  ON quiz_results FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quiz results"
  ON quiz_results FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for recommended_resources
CREATE POLICY "Users can view own recommended resources"
  ON recommended_resources FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recommended resources"
  ON recommended_resources FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recommended resources"
  ON recommended_resources FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recommended resources"
  ON recommended_resources FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for user_weaknesses
CREATE POLICY "Users can view own weaknesses"
  ON user_weaknesses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weaknesses"
  ON user_weaknesses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weaknesses"
  ON user_weaknesses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weaknesses"
  ON user_weaknesses FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for uploaded_materials
CREATE POLICY "Users can view own uploaded materials"
  ON uploaded_materials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own uploaded materials"
  ON uploaded_materials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own uploaded materials"
  ON uploaded_materials FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own uploaded materials"
  ON uploaded_materials FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. This schema uses Supabase Auth (auth.users table)
--    All user_id columns reference auth.users(id)
--
-- 2. RLS policies use auth.uid() to identify the current user
--    Users can only access their own data
--
-- 3. To disable RLS temporarily for testing:
--    ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
--
-- 4. JSONB columns store structured data:
--    - errors: Array of error objects
--    - questions: Array of question objects
--    - answers: Array of answer objects
--
-- 5. Google OAuth Setup:
--    - Go to Supabase Dashboard → Authentication → Providers
--    - Enable Google provider
--    - Add your Google OAuth credentials
--    - See GOOGLE_OAUTH_SETUP.md for detailed instructions
-- =====================================================

