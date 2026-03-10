/*
  # Add storage bucket for project files

  1. Changes
    - Create a new storage bucket for project files
    - Add policies for file access and management
*/

-- Create storage bucket for project files
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload project files
CREATE POLICY "Users can upload project files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to view project files
CREATE POLICY "Anyone can view project files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'project-files');

-- Allow users to delete their own project files
CREATE POLICY "Users can delete their own project files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);