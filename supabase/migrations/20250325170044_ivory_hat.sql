/*
  # Create storage tables for resumes

  1. Tables
    - Create a new table `resume_files` to store file metadata
    - Add RLS policies for secure access

  2. Security
    - Enable RLS on the new table
    - Add policies for authenticated users to upload files
    - Add policies for public access to published files
*/

-- Create a table to store resume file metadata
CREATE TABLE IF NOT EXISTS resume_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_url text NOT NULL,
  content_type text NOT NULL,
  size bigint NOT NULL,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Enable RLS
ALTER TABLE resume_files ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload and manage their own files
CREATE POLICY "Users can manage their own resume files"
  ON resume_files
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow public to view published files
CREATE POLICY "Public can view published resume files"
  ON resume_files
  FOR SELECT
  TO public
  USING (is_published = true);

-- Add an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_resume_files_user_id ON resume_files(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_files_is_published ON resume_files(is_published);

-- Add a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to automatically update updated_at
CREATE TRIGGER update_resume_files_updated_at
  BEFORE UPDATE ON resume_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();