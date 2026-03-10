/*
  # Create storage bucket for resumes

  1. New Storage Bucket
    - Creates a new public storage bucket named 'resumes'
    - Enables public access for authenticated users
  
  2. Security
    - Enables RLS policies for the storage bucket
    - Adds policies for:
      - Authenticated users can upload their own files
      - Anyone can download/view published files
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true);

-- Create policy to allow authenticated users to upload files
CREATE POLICY "Users can upload resume files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy to allow authenticated users to update their own files
CREATE POLICY "Users can update own resume files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy to allow authenticated users to delete their own files
CREATE POLICY "Users can delete own resume files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy to allow public access to files
CREATE POLICY "Anyone can view published resume files"
ON storage.objects FOR SELECT
USING (bucket_id = 'resumes');