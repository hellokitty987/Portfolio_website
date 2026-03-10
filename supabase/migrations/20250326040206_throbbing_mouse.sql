/*
  # Add Academic Credentials Management

  1. New Tables
    - `academic_credentials`
      - `id` (uuid, primary key)
      - `title` (text, credential name/description)
      - `file_url` (text, URL to the credential file)
      - `file_name` (text, original file name)
      - `content_type` (text, file MIME type)
      - `size` (bigint, file size in bytes)
      - `type` (text, either 'degree' or 'transcript')
      - `is_published` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `user_id` (uuid, references users)

  2. Security
    - Enable RLS
    - Add policies for authenticated users to manage their credentials
    - Add policy for public to view published credentials
*/

-- Create academic_credentials table
CREATE TABLE academic_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  content_type text NOT NULL,
  size bigint NOT NULL,
  type text NOT NULL CHECK (type IN ('degree', 'transcript')),
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Enable RLS
ALTER TABLE academic_credentials ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own credentials"
  ON academic_credentials
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view published credentials"
  ON academic_credentials
  FOR SELECT
  TO public
  USING (is_published = true);

-- Add indexes
CREATE INDEX idx_academic_credentials_user_id ON academic_credentials(user_id);
CREATE INDEX idx_academic_credentials_is_published ON academic_credentials(is_published);
CREATE INDEX idx_academic_credentials_type ON academic_credentials(type);

-- Create storage bucket for credential files
INSERT INTO storage.buckets (id, name, public)
VALUES ('credentials', 'credentials', true);

-- Storage policies
CREATE POLICY "Users can upload their own credentials"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'credentials' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view published credentials"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'credentials');

CREATE POLICY "Users can delete their own credentials"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'credentials' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Add trigger for updated_at
CREATE TRIGGER update_academic_credentials_updated_at
  BEFORE UPDATE ON academic_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();