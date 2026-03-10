/*
  # Update About Pages Management

  1. Changes
    - Add indexes for better query performance
    - Update RLS policies for better security
    - Add trigger for updated_at timestamp

  2. Security
    - Enable RLS
    - Add policies for authenticated users to manage their content
    - Add policy for public to view published content
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view published about pages" ON about_pages;
DROP POLICY IF EXISTS "Users can manage their about pages" ON about_pages;

-- Create more permissive policies
CREATE POLICY "Anyone can view published about pages"
ON about_pages
FOR SELECT
TO public
USING (is_published = true);

CREATE POLICY "Users can manage their about pages"
ON about_pages
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_about_pages_user_id ON about_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_about_pages_updated_at ON about_pages(updated_at DESC);

-- Ensure updated_at is automatically updated
CREATE OR REPLACE FUNCTION update_about_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_about_pages_updated_at ON about_pages;
CREATE TRIGGER update_about_pages_updated_at
  BEFORE UPDATE ON about_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_about_pages_updated_at();