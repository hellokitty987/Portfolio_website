/*
  # Allow authenticated users to manage all projects

  This widens project access so any signed-in admin user can read, create,
  update, delete, and reorder projects regardless of the original owner.
*/

drop policy if exists "Users can manage own projects" on public.projects;
drop policy if exists "Authenticated users can view all projects" on public.projects;
drop policy if exists "Authenticated users can manage all projects" on public.projects;

create policy "Authenticated users can manage all projects"
on public.projects
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

create or replace function public.reorder_projects_in_category(
  category_key text,
  ordered_project_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  normalized_category_key text := btrim(category_key);
  expected_project_ids uuid[];
  expected_project_count integer;
  provided_project_count integer := coalesce(array_length(ordered_project_ids, 1), 0);
begin
  if auth.uid() is null then
    raise exception 'Authentication required to reorder projects.';
  end if;

  if normalized_category_key is null or normalized_category_key = '' then
    raise exception 'A category key is required.';
  end if;

  if not public.project_categories_are_valid(jsonb_build_array(normalized_category_key)) then
    raise exception 'Invalid category key: %.', normalized_category_key;
  end if;

  if provided_project_count = 0 then
    raise exception 'ordered_project_ids must contain at least one project id.';
  end if;

  if exists (
    select 1
    from unnest(ordered_project_ids) as ordered_project(project_id)
    where ordered_project.project_id is null
  ) then
    raise exception 'ordered_project_ids cannot contain null values.';
  end if;

  if exists (
    select ordered_project.project_id
    from unnest(ordered_project_ids) as ordered_project(project_id)
    group by ordered_project.project_id
    having count(*) > 1
  ) then
    raise exception 'ordered_project_ids cannot contain duplicate values.';
  end if;

  perform 1
  from public.projects as project
  where public.project_primary_category(project.category) = normalized_category_key
  for update;

  select
    coalesce(array_agg(project.id order by project.created_at desc, project.id desc), '{}'::uuid[])
  into expected_project_ids
  from public.projects as project
  where public.project_primary_category(project.category) = normalized_category_key;

  expected_project_count := coalesce(array_length(expected_project_ids, 1), 0);

  if expected_project_count = 0 then
    raise exception 'No projects found for category %.', normalized_category_key;
  end if;

  if provided_project_count <> expected_project_count then
    raise exception
      'ordered_project_ids must include every project in category %. Expected %, received %.',
      normalized_category_key,
      expected_project_count,
      provided_project_count;
  end if;

  if exists (
    select 1
    from (
      (select unnest(ordered_project_ids) as project_id)
      except
      (select unnest(expected_project_ids) as project_id)
    ) as unexpected_projects
  ) then
    raise exception 'ordered_project_ids contains project ids outside category %.', normalized_category_key;
  end if;

  if exists (
    select 1
    from (
      (select unnest(expected_project_ids) as project_id)
      except
      (select unnest(ordered_project_ids) as project_id)
    ) as missing_projects
  ) then
    raise exception 'ordered_project_ids is missing projects from category %.', normalized_category_key;
  end if;

  with ordered_projects as (
    select
      ordered_project.project_id,
      ordered_project.ordinality - 1 as sort_position
    from unnest(ordered_project_ids) with ordinality as ordered_project(project_id, ordinality)
  )
  update public.projects as project
  set
    category_sort_order = jsonb_set(
      coalesce(project.category_sort_order, '{}'::jsonb),
      array[normalized_category_key],
      to_jsonb(ordered_projects.sort_position),
      true
    ),
    updated_at = now()
  from ordered_projects
  where project.id = ordered_projects.project_id
    and public.project_primary_category(project.category) = normalized_category_key;
end;
$function$;

revoke all on function public.reorder_projects_in_category(text, uuid[]) from public;
grant execute on function public.reorder_projects_in_category(text, uuid[]) to authenticated;
