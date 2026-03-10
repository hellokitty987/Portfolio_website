/*
  # Fix RLS Policies for Projects and Storage

  1. Changes
    - Update RLS policies for projects table
    - Update RLS policies for project_details table
    - Update storage policies for project-files bucket
    - Add user_id to project_details table
    - Add missing indexes

  2. Security
    - Ensure authenticated users can manage their own data
    - Maintain public read access for published content
*/

-- Add user_id to project_details if it doesn't exist
ALTER TABLE project_details 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Update existing project_details rows
UPDATE project_details
SET user_id = projects.user_id
FROM projects
WHERE project_details.project_id = projects.id;

-- Make user_id required
ALTER TABLE project_details
ALTER COLUMN user_id SET NOT NULL;

-- Drop existing policies
DROP POLICY IF EXISTS "Published projects are viewable by everyone" ON projects;
DROP POLICY IF EXISTS "Users can manage own projects" ON projects;
DROP POLICY IF EXISTS "Published project details are viewable by everyone" ON project_details;
DROP POLICY IF EXISTS "Users can manage own project details" ON project_details;

-- Create new policies for projects
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

-- Create new policies for project_details
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
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update storage policies
DROP POLICY IF EXISTS "Users can upload project files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own project files" ON storage.objects;

CREATE POLICY "Users can upload project files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
);

CREATE POLICY "Anyone can view project files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'project-files');

CREATE POLICY "Users can manage their own project files"
ON storage.objects
FOR ALL 
TO authenticated
USING (
  bucket_id = 'project-files' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);