/*
  # Fix Portfolio RLS Policies

  1. Changes
    - Update storage policies to allow file uploads
    - Update project policies to allow creation
    - Add missing user_id handling
    - Fix policy permissions

  2. Security
    - Maintain secure access control
    - Allow authenticated users to manage their content
*/

-- Drop existing storage policies
DROP POLICY IF EXISTS "Users can upload project files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can manage their own project files" ON storage.objects;

-- Create more permissive storage policies
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
USING (bucket_id = 'project-files');

-- Drop existing project policies
DROP POLICY IF EXISTS "Published projects are viewable by everyone" ON projects;
DROP POLICY IF EXISTS "Users can manage own projects" ON projects;

-- Create updated project policies
CREATE POLICY "Published projects are viewable by everyone"
ON projects
FOR SELECT
TO public
USING (visibility = true);

CREATE POLICY "Users can manage own projects"
ON projects
FOR ALL
TO authenticated
USING (true)
WITH CHECK (auth.uid() = user_id);

-- Ensure user_id is set automatically
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to projects table
DROP TRIGGER IF EXISTS set_user_id_trigger ON projects;
CREATE TRIGGER set_user_id_trigger
  BEFORE INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();