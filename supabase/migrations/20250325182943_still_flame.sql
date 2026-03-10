/*
  # Add About Page Management

  1. New Tables
    - `about_pages`
      - `id` (uuid, primary key)
      - `content` (jsonb, stores page sections and content)
      - `is_published` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `user_id` (uuid, references users)

  2. Security
    - Enable RLS
    - Add policies for authenticated users to manage their content
    - Add policy for public to view published content
*/

CREATE TABLE about_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users NOT NULL
);

ALTER TABLE about_pages ENABLE ROW LEVEL SECURITY;

-- Policy for public to view published content
CREATE POLICY "Anyone can view published about pages"
  ON about_pages
  FOR SELECT
  USING (is_published = true);

-- Policy for authenticated users to manage their content
CREATE POLICY "Users can manage their about pages"
  ON about_pages
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger to update the updated_at timestamp
CREATE TRIGGER update_about_pages_updated_at
  BEFORE UPDATE ON about_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();