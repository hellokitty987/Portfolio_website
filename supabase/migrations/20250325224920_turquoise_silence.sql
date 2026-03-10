/*
  # Lock in final schema changes

  1. Changes
    - Add default values for profile settings
    - Update content structure for about pages
    - Ensure all tables have proper indexes
    - Add missing RLS policies
*/

-- Ensure profile_settings has proper defaults
ALTER TABLE profile_settings
ALTER COLUMN title SET DEFAULT 'Software Developer',
ALTER COLUMN avatar_url SET DEFAULT 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&h=400&fit=crop';

-- Add indexes for frequently accessed columns
CREATE INDEX IF NOT EXISTS idx_about_pages_is_published ON about_pages(is_published);
CREATE INDEX IF NOT EXISTS idx_projects_is_published ON projects(is_published);
CREATE INDEX IF NOT EXISTS idx_pages_is_published ON pages(is_published);
CREATE INDEX IF NOT EXISTS idx_resumes_is_published ON resumes(is_published);

-- Add missing RLS policies if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'about_pages' 
    AND policyname = 'Users can view published about pages'
  ) THEN
    CREATE POLICY "Users can view published about pages"
      ON about_pages
      FOR SELECT
      TO public
      USING (is_published = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profile_settings' 
    AND policyname = 'Users can view all profile settings'
  ) THEN
    CREATE POLICY "Users can view all profile settings"
      ON profile_settings
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;