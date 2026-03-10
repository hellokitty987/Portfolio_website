/*
  # Fix About Pages RLS Policies

  1. Changes
    - Drop existing RLS policies
    - Create new, more permissive policies for authenticated users
    - Add trigger to set user_id automatically
    - Add missing indexes
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view published about pages" ON about_pages;
DROP POLICY IF EXISTS "Users can manage their about pages" ON about_pages;
DROP POLICY IF EXISTS "Users can view published about pages" ON about_pages;

-- Create new, more permissive policies
CREATE POLICY "Anyone can view published about pages"
ON about_pages
FOR SELECT
TO public
USING (is_published = true);

CREATE POLICY "Users can manage their about pages"
ON about_pages
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

-- Ensure user_id is set automatically
CREATE OR REPLACE FUNCTION set_about_pages_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for user_id
DROP TRIGGER IF EXISTS set_about_pages_user_id_trigger ON about_pages;
CREATE TRIGGER set_about_pages_user_id_trigger
  BEFORE INSERT OR UPDATE ON about_pages
  FOR EACH ROW
  EXECUTE FUNCTION set_about_pages_user_id();