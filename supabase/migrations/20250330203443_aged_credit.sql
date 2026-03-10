/*
  # Portfolio Schema Setup
  
  1. New Tables
    - projects: Stores portfolio project metadata
    - project_details: Stores detailed project content
  
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users and public access
*/

-- Create project category enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE project_category AS ENUM (
    'data_science',
    'machine_learning',
    'software_development',
    'solution_diagrams',
    'bim',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create projects table (Portfolio Preview)
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  short_description text,
  category text[],
  thumbnail_file text,
  visibility boolean DEFAULT false,
  slug text UNIQUE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  user_id uuid REFERENCES auth.users NOT NULL
);

-- Create project_details table (Project Page Content)
CREATE TABLE IF NOT EXISTS project_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  full_title text,
  description text,
  visualization_type text CHECK (
    visualization_type IN ('tableau', 'video', 'image_gallery')
  ),
  tableau_embed_code text,
  video_file text,
  image_gallery_files jsonb DEFAULT '[]'::jsonb,
  source_code_gist_url text,
  source_code_plaintext text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_details ENABLE ROW LEVEL SECURITY;

-- Create indexes first
CREATE INDEX IF NOT EXISTS idx_projects_visibility ON projects(visibility);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_project_details_project_id ON project_details(project_id);

-- Projects policies
DO $$ BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Published projects are viewable by everyone" ON projects;
  DROP POLICY IF EXISTS "Users can manage own projects" ON projects;
  
  -- Create new policies
  CREATE POLICY "Published projects are viewable by everyone"
    ON projects
    FOR SELECT
    TO public
    USING (visibility = true);

  CREATE POLICY "Users can manage own projects"
    ON projects
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
END $$;

-- Project details policies
DO $$ BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Published project details are viewable by everyone" ON project_details;
  DROP POLICY IF EXISTS "Users can manage own project details" ON project_details;
  
  -- Create new policies
  CREATE POLICY "Published project details are viewable by everyone"
    ON project_details
    FOR SELECT
    TO public
    USING (
      EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = project_details.project_id
        AND projects.visibility = true
      )
    );

  CREATE POLICY "Users can manage own project details"
    ON project_details
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = project_details.project_id
        AND projects.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = project_details.project_id
        AND projects.user_id = auth.uid()
      )
    );
END $$;

-- Create storage bucket
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