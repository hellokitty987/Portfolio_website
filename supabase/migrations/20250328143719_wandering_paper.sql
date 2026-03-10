/*
  # Add Project Categories and Details

  1. Changes
    - Add category enum type for projects
    - Add embed_type enum for different visualization types
    - Add new columns to projects table for detailed content
    - Add indexes for efficient querying

  2. Security
    - Maintain existing RLS policies
*/

-- Create project category enum
DO $$ BEGIN
  CREATE TYPE project_category AS ENUM (
    'data_science',
    'machine_learning',
    'software_development',
    'solution_diagrams',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create embed type enum
DO $$ BEGIN
  CREATE TYPE embed_type AS ENUM (
    'tableau',
    'video',
    'image'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to projects table
DO $$ BEGIN
  -- Add category column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'category'
  ) THEN
    ALTER TABLE projects ADD COLUMN category project_category DEFAULT 'other';
  END IF;

  -- Add detailed_content column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'detailed_content'
  ) THEN
    ALTER TABLE projects ADD COLUMN detailed_content text;
  END IF;

  -- Add embed_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'embed_type'
  ) THEN
    ALTER TABLE projects ADD COLUMN embed_type embed_type;
  END IF;

  -- Add source_code column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'source_code'
  ) THEN
    ALTER TABLE projects ADD COLUMN source_code text;
  END IF;

  -- Add slug column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'slug'
  ) THEN
    ALTER TABLE projects ADD COLUMN slug text;
    -- Add unique constraint to slug column
    ALTER TABLE projects ADD CONSTRAINT projects_slug_key UNIQUE (slug);
  END IF;
END $$;

-- Add indexes if they don't exist
DO $$ BEGIN
  -- Create index for category if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'projects' AND indexname = 'idx_projects_category'
  ) THEN
    CREATE INDEX idx_projects_category ON projects(category);
  END IF;

  -- Create index for slug if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'projects' AND indexname = 'idx_projects_slug'
  ) THEN
    CREATE INDEX idx_projects_slug ON projects(slug);
  END IF;
END $$;