-- Brio v3.0.3: project task workflow
-- Adds project-owned tasks without changing existing project or milestone data.

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  description text not null default '',
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'blocked', 'review', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_tasks_project_id_idx on public.project_tasks(project_id);
create index if not exists project_tasks_user_due_date_idx on public.project_tasks(user_id, due_date);
create index if not exists project_tasks_user_status_idx on public.project_tasks(user_id, status);

alter table public.project_tasks enable row level security;

create policy "Users can view their own project tasks"
  on public.project_tasks for select
  using (auth.uid() = user_id);

create policy "Users can create their own project tasks"
  on public.project_tasks for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.projects
      where projects.id = project_tasks.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "Users can update their own project tasks"
  on public.project_tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own project tasks"
  on public.project_tasks for delete
  using (auth.uid() = user_id);

create or replace function public.set_project_tasks_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists project_tasks_updated_at on public.project_tasks;
create trigger project_tasks_updated_at
  before update on public.project_tasks
  for each row execute function public.set_project_tasks_updated_at();
