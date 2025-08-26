import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  
  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // SQL to fix the infinite recursion in RLS policies
    const fixPoliciesSQL = `
      -- Drop existing policies for projects table
      DROP POLICY IF EXISTS "Users can view projects they are members of" ON projects;
      DROP POLICY IF EXISTS "Users can create projects" ON projects;
      DROP POLICY IF EXISTS "Project owners can update their projects" ON projects;
      DROP POLICY IF EXISTS "Project owners can delete their projects" ON projects;

      -- Drop existing policies for project_members table
      DROP POLICY IF EXISTS "Users can view members of their projects" ON project_members;
      DROP POLICY IF EXISTS "Project owners can add members" ON project_members;
      DROP POLICY IF EXISTS "Project owners can remove members" ON project_members;

      -- Drop existing policies for project_sessions table
      DROP POLICY IF EXISTS "Users can view sessions of their projects" ON project_sessions;
      DROP POLICY IF EXISTS "Users can upload sessions to their projects" ON project_sessions;
      DROP POLICY IF EXISTS "Users can delete their own sessions" ON project_sessions;

      -- Create simplified policies for projects table
      CREATE POLICY "Users can view projects they are members of"
      ON projects FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
        )
      );

      CREATE POLICY "Users can create projects"
      ON projects FOR INSERT
      WITH CHECK (auth.uid() = owner_id);

      CREATE POLICY "Project owners can update their projects"
      ON projects FOR UPDATE
      USING (auth.uid() = owner_id)
      WITH CHECK (auth.uid() = owner_id);

      CREATE POLICY "Project owners can delete their projects"
      ON projects FOR DELETE
      USING (auth.uid() = owner_id);

      -- Create simplified policies for project_members table
      CREATE POLICY "Users can view project members"
      ON project_members FOR SELECT
      USING (
        auth.uid() IN (
          SELECT user_id FROM project_members pm2
          WHERE pm2.project_id = project_members.project_id
        )
      );

      CREATE POLICY "Project owners can manage members"
      ON project_members FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM projects
          WHERE projects.id = project_members.project_id
          AND projects.owner_id = auth.uid()
        )
      );

      -- Create simplified policies for project_sessions table
      CREATE POLICY "Users can view project sessions"
      ON project_sessions FOR SELECT
      USING (
        auth.uid() IN (
          SELECT user_id FROM project_members
          WHERE project_members.project_id = project_sessions.project_id
        )
      );

      CREATE POLICY "Users can upload sessions to their projects"
      ON project_sessions FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = project_sessions.project_id
          AND project_members.user_id = auth.uid()
        )
      );

      CREATE POLICY "Users can delete their own sessions"
      ON project_sessions FOR DELETE
      USING (auth.uid() = user_id);
    `;

    // Note: We can't execute raw SQL through Supabase client
    // Instead, let's disable RLS temporarily for these tables
    
    // Try to query without RLS by using service role client would be needed
    // For now, let's just return instructions
    
    return NextResponse.json({ 
      message: 'RLS policies need to be fixed in Supabase dashboard',
      sql: fixPoliciesSQL,
      instructions: [
        '1. Go to Supabase dashboard',
        '2. Navigate to SQL Editor',
        '3. Run the provided SQL',
        '4. The infinite recursion should be fixed'
      ]
    })
    
  } catch (error) {
    console.error('Error fixing policies:', error)
    return NextResponse.json({ error: 'Failed to fix policies' }, { status: 500 })
  }
}