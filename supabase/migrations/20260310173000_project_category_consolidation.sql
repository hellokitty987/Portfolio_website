/*
  # Consolidate project categories

  1. Safety
    - Snapshot existing project categories before rewriting values
    - Abort if any row contains unexpected category values or invalid JSON shapes

  2. Changes
    - Merge data_science and machine_learning into data_science_ml
    - Rename solution_diagrams to data_engineering_system_design
    - Deduplicate category arrays while preserving original order
    - Enforce canonical category values on projects.category jsonb arrays
*/

create schema if not exists private;

do $$
declare
  category_data_type text;
  category_udt_name text;
begin
  select
    data_type,
    udt_name
  into
    category_data_type,
    category_udt_name
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'projects'
    and column_name = 'category';

  if category_data_type is null then
    raise exception 'Cannot consolidate project categories: public.projects.category does not exist.';
  end if;

  execute 'alter table public.projects alter column category drop default';

  if category_udt_name = 'jsonb' then
    null;
  elsif category_data_type = 'ARRAY' then
    execute $sql$
      alter table public.projects
      alter column category type jsonb
      using to_jsonb(coalesce(category, array[]::text[]))
    $sql$;
  else
    execute $sql$
      alter table public.projects
      alter column category type jsonb
      using case
        when category is null then '[]'::jsonb
        else jsonb_build_array(category::text)
      end
    $sql$;
  end if;
end $$;

create table if not exists private.project_category_migration_backups (
  migration_name text not null,
  project_id uuid not null,
  original_category jsonb not null,
  backed_up_at timestamp with time zone not null default now(),
  primary key (migration_name, project_id)
);

insert into private.project_category_migration_backups (migration_name, project_id, original_category)
select
  '20260310173000_project_category_consolidation',
  id,
  coalesce(category, '[]'::jsonb)
from public.projects
on conflict (migration_name, project_id) do nothing;

do $$
declare
  project_count bigint;
  legacy_count bigint;
  invalid_shape_count bigint;
  non_string_value_count bigint;
  unexpected_categories text;
begin
  select count(*) into project_count from public.projects;

  select count(*)
  into legacy_count
  from public.projects
  where coalesce(category, '[]'::jsonb) ?| array['data_science', 'machine_learning', 'solution_diagrams'];

  select count(*)
  into invalid_shape_count
  from public.projects
  where category is not null
    and jsonb_typeof(category) <> 'array';

  if invalid_shape_count > 0 then
    raise exception
      'Cannot consolidate project categories: found % rows where projects.category is not a JSON array.',
      invalid_shape_count;
  end if;

  select count(*)
  into non_string_value_count
  from public.projects p
  cross join lateral jsonb_array_elements(coalesce(p.category, '[]'::jsonb)) as category_item(value)
  where jsonb_typeof(category_item.value) <> 'string';

  if non_string_value_count > 0 then
    raise exception
      'Cannot consolidate project categories: found % non-string category entries.',
      non_string_value_count;
  end if;

  select string_agg(distinct category_item.value, ', ' order by category_item.value)
  into unexpected_categories
  from (
    select jsonb_array_elements_text(coalesce(category, '[]'::jsonb)) as value
    from public.projects
  ) as category_item
  where category_item.value not in (
    'data_science',
    'machine_learning',
    'solution_diagrams',
    'data_science_ml',
    'software_development',
    'data_engineering_system_design',
    'bim'
  );

  if unexpected_categories is not null then
    raise exception
      'Cannot consolidate project categories: found unexpected values (%).',
      unexpected_categories;
  end if;

  raise notice
    'Project category consolidation starting. Projects: %, rows with legacy categories: %.',
    project_count,
    legacy_count;
end $$;

update public.projects
set category = '[]'::jsonb
where category is null;

update public.projects as projects
set category = normalized.category
from (
  select
    project.id,
    coalesce(
      (
        select jsonb_agg(to_jsonb(mapped.category) order by mapped.first_position)
        from (
          select
            case category_item.value
              when 'data_science' then 'data_science_ml'
              when 'machine_learning' then 'data_science_ml'
              when 'solution_diagrams' then 'data_engineering_system_design'
              else category_item.value
            end as category,
            min(category_item.ordinality) as first_position
          from jsonb_array_elements_text(project.category) with ordinality as category_item(value, ordinality)
          group by 1
        ) as mapped
      ),
      '[]'::jsonb
    ) as category
  from public.projects as project
) as normalized
where projects.id = normalized.id;

create or replace function public.project_categories_are_valid(category_value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $function$
  select
    jsonb_typeof(category_value) = 'array'
    and not exists (
      select 1
      from jsonb_array_elements(category_value) as category_item(value)
      where jsonb_typeof(category_item.value) <> 'string'
    )
    and not exists (
      select 1
      from jsonb_array_elements_text(category_value) as category_item(value)
      where category_item.value not in (
        'data_science_ml',
        'software_development',
        'data_engineering_system_design',
        'bim'
      )
    );
$function$;

alter table public.projects
  alter column category set default '[]'::jsonb;

alter table public.projects
  alter column category set not null;

alter table public.projects
  drop constraint if exists projects_category_is_valid;

alter table public.projects
  add constraint projects_category_is_valid
  check (public.project_categories_are_valid(category));
