/*
  # Add per-category project ordering

  1. Changes
    - Add category_sort_order jsonb column to public.projects
    - Backfill existing rows using current created_at desc ordering per category
    - Keep sort-order keys aligned with project categories
    - Add admin RPC for drag-and-drop reordering
*/

alter table public.projects
  add column if not exists category_sort_order jsonb not null default '{}'::jsonb;

create or replace function public.project_primary_category(category_value jsonb)
returns text
language sql
immutable
set search_path = ''
as $function$
  select coalesce(
    (
      select category_item.value
      from jsonb_array_elements_text(coalesce(category_value, '[]'::jsonb))
        with ordinality as category_item(value, ordinality)
      order by
        case category_item.value
          when 'data_science_ml' then 1
          when 'software_development' then 2
          when 'data_engineering_system_design' then 3
          when 'bim' then 4
          else 999
        end,
        category_item.ordinality
      limit 1
    ),
    'uncategorized'
  );
$function$;

create or replace function public.project_category_sort_order_is_valid(
  category_value jsonb,
  sort_order_value jsonb
)
returns boolean
language sql
immutable
set search_path = ''
as $function$
  select case
    when jsonb_typeof(category_value) <> 'array' then false
    when jsonb_typeof(sort_order_value) <> 'object' then false
    else not exists (
      select 1
      from jsonb_each(sort_order_value) as sort_entry(key, value)
      where key not in (
          select jsonb_array_elements_text(category_value)
        )
        or jsonb_typeof(value) <> 'number'
        or value::text !~ '^[0-9]+$'
    )
  end;
$function$;

with ranked_projects as (
  select
    project.id,
    category_item.value as category_key,
    row_number() over (
      partition by category_item.value
      order by project.created_at desc, project.id desc
    ) - 1 as sort_position
  from public.projects as project
  cross join lateral jsonb_array_elements_text(coalesce(project.category, '[]'::jsonb)) as category_item(value)
),
aggregated_positions as (
  select
    ranked_projects.id,
    jsonb_object_agg(ranked_projects.category_key, ranked_projects.sort_position) as category_sort_order
  from ranked_projects
  group by ranked_projects.id
)
update public.projects as project
set category_sort_order = coalesce(aggregated_positions.category_sort_order, '{}'::jsonb)
from aggregated_positions
where project.id = aggregated_positions.id;

update public.projects
set category_sort_order = '{}'::jsonb
where jsonb_array_length(coalesce(category, '[]'::jsonb)) = 0;

create or replace function public.sync_project_category_sort_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  normalized_sort_order jsonb := '{}'::jsonb;
  category_key text;
  next_position integer;
begin
  new.category := coalesce(new.category, '[]'::jsonb);

  for category_key in
    select category_entries.category_key
    from (
      select
        category_item.value as category_key,
        min(category_item.ordinality) as first_ordinality
      from jsonb_array_elements_text(new.category)
        with ordinality as category_item(value, ordinality)
      group by category_item.value
    ) as category_entries
    order by category_entries.first_ordinality
  loop
    if coalesce(new.category_sort_order, '{}'::jsonb) ? category_key
      and coalesce(new.category_sort_order ->> category_key, '') ~ '^[0-9]+$'
    then
      normalized_sort_order := normalized_sort_order || jsonb_build_object(
        category_key,
        (new.category_sort_order ->> category_key)::integer
      );
    else
      select
        coalesce(max((project.category_sort_order ->> category_key)::integer), -1) + 1
      into next_position
      from public.projects as project
      where project.id is distinct from new.id
        and coalesce(project.category, '[]'::jsonb) ? category_key
        and project.category_sort_order ? category_key
        and coalesce(project.category_sort_order ->> category_key, '') ~ '^[0-9]+$';

      normalized_sort_order := normalized_sort_order || jsonb_build_object(
        category_key,
        next_position
      );
    end if;
  end loop;

  new.category_sort_order := normalized_sort_order;
  return new;
end;
$function$;

drop trigger if exists sync_project_category_sort_order_trigger on public.projects;

create trigger sync_project_category_sort_order_trigger
before insert or update of category, category_sort_order
on public.projects
for each row
execute function public.sync_project_category_sort_order();

alter table public.projects
  drop constraint if exists projects_category_sort_order_is_valid;

alter table public.projects
  add constraint projects_category_sort_order_is_valid
  check (public.project_category_sort_order_is_valid(category, category_sort_order));

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
  where project.user_id = auth.uid()
    and public.project_primary_category(project.category) = normalized_category_key
  for update;

  select
    coalesce(array_agg(project.id order by project.created_at desc, project.id desc), '{}'::uuid[])
  into expected_project_ids
  from public.projects as project
  where project.user_id = auth.uid()
    and public.project_primary_category(project.category) = normalized_category_key;

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
    and project.user_id = auth.uid()
    and public.project_primary_category(project.category) = normalized_category_key;
end;
$function$;

revoke all on function public.reorder_projects_in_category(text, uuid[]) from public;
grant execute on function public.reorder_projects_in_category(text, uuid[]) to authenticated;
