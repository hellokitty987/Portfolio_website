/*
  # Add Profile Settings Management

  1. New Tables
    - `profile_settings`
      - `id` (uuid, primary key)
      - `name` (text, user's display name)
      - `title` (text, job title)
      - `avatar_url` (text, profile photo URL)
      - `github_url` (text, GitHub profile URL)
      - `twitter_url` (text, Twitter/X profile URL)
      - `linkedin_url` (text, LinkedIn profile URL)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `user_id` (uuid, references users)

  2. Security
    - Enable RLS
    - Add policies for authenticated users to manage their settings
    - Add policy for public to view settings
*/

CREATE TABLE profile_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text,
  avatar_url text,
  github_url text,
  twitter_url text,
  linkedin_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users NOT NULL
);

ALTER TABLE profile_settings ENABLE ROW LEVEL SECURITY;

-- Policy for public to view settings
CREATE POLICY "Anyone can view profile settings"
  ON profile_settings
  FOR SELECT
  USING (true);

-- Policy for authenticated users to manage their settings
CREATE POLICY "Users can manage their profile settings"
  ON profile_settings
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger to update the updated_at timestamp
CREATE TRIGGER update_profile_settings_updated_at
  BEFORE UPDATE ON profile_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();