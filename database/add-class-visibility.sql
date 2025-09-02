-- Add visibility field to classes table
-- This will allow classes to be marked as 'public' (visible to clients) or 'private' (only visible to reception, instructors, and admin)

ALTER TABLE classes ADD COLUMN visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'private'));

-- Add index for better query performance when filtering by visibility
CREATE INDEX IF NOT EXISTS idx_classes_visibility ON classes(visibility);

-- Update RLS policies to respect visibility settings
-- Clients should only see public classes
DROP POLICY IF EXISTS "Clients can view active classes" ON classes;
CREATE POLICY "Clients can view active classes" ON classes
  FOR SELECT USING (
    -- Allow if user is not a client (admin, instructor, reception)
    (auth.jwt() ->> 'role') != 'client' 
    OR 
    -- Allow if user is client and class is public
    ((auth.jwt() ->> 'role') = 'client' AND visibility = 'public')
  );

-- Staff (admin, instructor, reception) can see all classes regardless of visibility
DROP POLICY IF EXISTS "Staff can view all classes" ON classes;
CREATE POLICY "Staff can view all classes" ON classes
  FOR SELECT USING (
    (auth.jwt() ->> 'role') IN ('admin', 'instructor', 'reception')
  );

-- Update any existing classes to have public visibility by default
UPDATE classes SET visibility = 'public' WHERE visibility IS NULL;
