-- Create table for caching user resources to avoid regenerating when no new data exists
CREATE TABLE IF NOT EXISTS user_resources_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resources JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommended_topics TEXT[] NOT NULL DEFAULT '{}',
    learning_path TEXT,
    total_weak_topics INTEGER DEFAULT 0,
    cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    data_timestamp TIMESTAMPTZ NOT NULL, -- Timestamp of the latest quiz/midterm data used to generate this cache
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id) -- One cache per user
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_resources_cache_user_id ON user_resources_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_user_resources_cache_data_timestamp ON user_resources_cache(data_timestamp);

-- Enable Row Level Security
ALTER TABLE user_resources_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own cache
CREATE POLICY "Users can read their own resources cache"
    ON user_resources_cache
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Service role can do everything (for backend operations)
CREATE POLICY "Service role can manage resources cache"
    ON user_resources_cache
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- Add comment
COMMENT ON TABLE user_resources_cache IS 'Caches generated resources for users to avoid regenerating when no new quiz/midterm data exists';

