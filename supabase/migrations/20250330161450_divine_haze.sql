/*
  # Portfolio Schema Updates
  
  1. Changes
    - Add visualization_type enum
    - Update projects table with new columns
    - Add indexes for better performance
    - Add constraints for data validation
*/

-- Create visualization type enum
DO $$ BEGIN
  CREATE TYPE visualization_type AS ENUM (
    'tableau',
    'video',
    'image_gallery'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS short_description text,
ADD COLUMN IF NOT EXISTS full_title text,
ADD COLUMN IF NOT EXISTS category text[] DEFAULT ARRAY['other'],
ADD COLUMN IF NOT EXISTS thumbnail_url text,
ADD COLUMN IF NOT EXISTS visibility boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS visualization_type visualization_type,
ADD COLUMN IF NOT EXISTS tableau_embed_code text,
ADD COLUMN IF NOT EXISTS video_url text,
ADD COLUMN IF NOT EXISTS image_gallery_urls jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS source_code_gist_url text,
ADD COLUMN IF NOT EXISTS source_code_plaintext text;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_visibility ON projects(visibility);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects USING btree (category);

-- Add constraint for visualization type
ALTER TABLE projects
ADD CONSTRAINT valid_visualization_type
CHECK (
  CASE 
    WHEN visualization_type = 'tableau' THEN tableau_embed_code IS NOT NULL
    WHEN visualization_type = 'video' THEN video_url IS NOT NULL
    WHEN visualization_type = 'image_gallery' THEN 
      image_gallery_urls IS NOT NULL AND 
      image_gallery_urls != '[]'::jsonb
    ELSE true
  END
);

-- Create storage bucket for project files if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$ BEGIN
  -- Allow authenticated users to upload project files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can upload project files'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Users can upload project files"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'project-files' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  -- Allow public to view project files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Anyone can view project files'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Anyone can view project files"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'project-files');
  END IF;

  -- Allow users to delete their own project files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can delete their own project files'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Users can delete their own project files"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'project-files' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;