/*
  # Update About Pages Content Structure

  1. Changes
    - Update content structure to use sections array
    - Add validation for content structure
    - Migrate existing data to new format
  
  2. Security
    - Maintains existing RLS policies
*/

-- First, update any existing rows to have valid content structure
UPDATE about_pages
SET content = jsonb_build_object(
  'sections', COALESCE(
    CASE 
      WHEN content->>'introduction' IS NOT NULL THEN
        jsonb_build_array(
          jsonb_build_object(
            'id', gen_random_uuid(),
            'title', 'Introduction',
            'content', content->>'introduction',
            'order', 0
          )
        )
      ELSE
        jsonb_build_array(
          jsonb_build_object(
            'id', gen_random_uuid(),
            'title', 'Introduction',
            'content', '',
            'order', 0
          )
        )
    END,
    jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid(),
        'title', 'Introduction',
        'content', '',
        'order', 0
      )
    )
  )
)
WHERE content IS NULL OR content->>'sections' IS NULL;

-- Now set the default for new rows
ALTER TABLE about_pages
ALTER COLUMN content SET DEFAULT jsonb_build_object(
  'sections', jsonb_build_array(
    jsonb_build_object(
      'id', gen_random_uuid(),
      'title', 'Introduction',
      'content', '',
      'order', 0
    )
  )
);

-- Finally, add the constraint now that all rows are valid
ALTER TABLE about_pages
ADD CONSTRAINT valid_content_structure
CHECK (
  (content->>'sections') IS NOT NULL
  AND jsonb_typeof(content->'sections') = 'array'
);