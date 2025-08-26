-- Temporarily disable RLS for project tables to avoid infinite recursion
-- This should be run in Supabase SQL Editor

-- Disable RLS on project tables
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_sessions DISABLE ROW LEVEL SECURITY;

-- Note: This is a temporary fix. RLS should be re-enabled with proper policies
-- that don't cause infinite recursion once the policies are fixed.