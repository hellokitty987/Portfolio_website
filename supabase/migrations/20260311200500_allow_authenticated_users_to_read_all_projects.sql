/*
  # Allow authenticated users to read all projects

  Public users can still only read visible projects.
  Any signed-in user can read the full projects table in the admin UI.
*/

drop policy if exists "Authenticated users can view all projects" on public.projects;

create policy "Authenticated users can view all projects"
on public.projects
for select
to authenticated
using (true);
