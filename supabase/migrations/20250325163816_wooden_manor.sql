/*
  # Add resume management

  1. New Tables
    - `resumes`
      - `id` (uuid, primary key)
      - `content` (text, for markdown content)
      - `pdf_url` (text, for uploaded PDF URL)
      - `is_published` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `user_id` (uuid, foreign key)

  2. Security
    - Enable RLS on `resumes` table
    - Add policies for authenticated users to manage their resumes
    - Add policy for public to view published resumes
*/

CREATE TABLE IF NOT EXISTS resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text,
  pdf_url text,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) NOT NULL
);

ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own resumes
CREATE POLICY "Users can manage own resumes"
  ON resumes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow public to view published resumes
CREATE POLICY "Public can view published resumes"
  ON resumes
  FOR SELECT
  TO public
  USING (is_published = true);