/*
  # Fix Portfolio Preview Functionality

  1. Changes
    - Update projects table to handle user_id properly
    - Simplify RLS policies for initial project creation
    - Fix storage policies for file uploads
    - Add missing indexes

  2. Security
    - Maintain secure access while allowing proper functionality
    - Ensure authenticated users can create projects
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage own projects" ON projects;
DROP POLICY IF EXISTS "Users can upload project files" ON storage.objects;

-- Create more permissive policies for project creation
CREATE POLICY "Users can manage own projects"
ON projects
FOR ALL
TO authenticated
USING (
  CASE 
    WHEN auth.uid() IS NOT NULL THEN 
      CASE
        WHEN user_id IS NULL THEN true  -- Allow initial creation
        ELSE auth.uid() = user_id       -- Then restrict to owner
      END
    ELSE false
  END
)
WITH CHECK (
  CASE 
    WHEN auth.uid() IS NOT NULL THEN 
      CASE
        WHEN user_id IS NULL THEN true  -- Allow initial creation
        ELSE auth.uid() = user_id       -- Then restrict to owner
      END
    ELSE false
  END
);

-- Update storage policies to be more permissive
CREATE POLICY "Users can upload project files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-files');

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- Ensure user_id is set automatically
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS set_user_id_trigger ON projects;
CREATE TRIGGER set_user_id_trigger
  BEFORE INSERT OR UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();