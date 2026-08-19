-- ============================================================
-- Brio — Stage 2: Projects Workspace
-- Migration 002
--
-- Extends the existing `projects` table with the opinionated
-- narrative fields (status, summary, reflection, cover image,
-- publishing) and adds the new primitives required by the
-- Stage 2 PRD: Milestones, Artifacts, and typed Tags.
--
-- This migration is additive and backward compatible:
--  - No existing columns are dropped or renamed.
--  - `problem` / `action` / `result` are reused as the
--    "Problem & Objectives" / "Solution & Process" /
--    "Results & Metrics" narrative fields.
--  - Every existing Stage 1 project is backfilled to `status = 'draft'`.
-- ============================================================

-- ============================================================
-- PROJECTS: new columns
-- ============================================================
alter table public.projects
  add column if not exists status text not null default 'draft',
  add column if not exists summary text not null default '',
  add column if not exists constraints text not null default '',
  add column if not exists reflection text not null default '',
  add column if not exists cover_image_url text,
  add column if not exists template text,
  add column if not exists published_at timestamptz;

alter table public.projects
  drop constraint if exists projects_status_check;
alter table public.projects
  add constraint projects_status_check check (status in ('draft', 'published', 'archived'));

create index if not exists projects_status_idx on public.projects(user_id, status);

-- Keep `date`/`start_year` as the display date; `published_at` tracks
-- when the project first went live so we can compute Time to Publish.

-- ============================================================
-- PROJECT MILESTONES (Timeline & Milestones)
-- ============================================================
create table if not exists public.project_milestones (
  id              uuid primary key default uuid_generate_v4(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  title           text not null,
  description     text not null default '',
  milestone_date  text not null default '',
  outcome         text not null default '',
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists project_milestones_project_id_idx on public.project_milestones(project_id);

create trigger trg_project_milestones_updated_at
  before update on public.project_milestones
  for each row execute function public.handle_updated_at();

-- ============================================================
-- PROJECT ARTIFACTS (Artifact Gallery)
-- ============================================================
create table if not exists public.project_artifacts (
  id            uuid primary key default uuid_generate_v4(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  kind          text not null default 'file',
  category      text not null default 'General',
  url           text not null,
  storage_path  text,
  caption       text not null default '',
  file_name     text,
  file_size     integer,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  constraint project_artifacts_kind_check check (kind in ('image', 'video', 'file', 'link'))
);
create index if not exists project_artifacts_project_id_idx on public.project_artifacts(project_id);

-- ============================================================
-- TAGS (typed: Skill / Technology / Domain)
-- ============================================================
create table if not exists public.tags (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  type        text not null default 'skill',
  created_at  timestamptz not null default now(),
  constraint tags_type_check check (type in ('skill', 'tech', 'domain')),
  unique (user_id, name, type)
);
create index if not exists tags_user_id_idx on public.tags(user_id);

create table if not exists public.project_tags (
  project_id  uuid not null references public.projects(id) on delete cascade,
  tag_id      uuid not null references public.tags(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (project_id, tag_id)
);
create index if not exists project_tags_tag_id_idx on public.project_tags(tag_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.project_milestones enable row level security;
alter table public.project_artifacts enable row level security;
alter table public.tags enable row level security;
alter table public.project_tags enable row level security;

-- Reviewers can view a project once it is published (shareable link),
-- in addition to the existing "owner can view own projects" policy.
create policy "Published projects are publicly viewable"
  on public.projects for select
  using (status = 'published');

-- Reviewers can view the (limited) profile of a published project's author,
-- independent of that user's general `is_public` setting.
create policy "Profiles of published project authors are publicly viewable"
  on public.profiles for select
  using (
    exists (
      select 1 from public.projects
      where public.projects.user_id = public.profiles.id
        and public.projects.status = 'published'
    )
  );

-- PROJECT MILESTONES policies
create policy "Users can view own project milestones"
  on public.project_milestones for select
  using (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));

create policy "Public can view milestones of published projects"
  on public.project_milestones for select
  using (exists (select 1 from public.projects where id = project_id and status = 'published'));

create policy "Users can insert own project milestones"
  on public.project_milestones for insert
  with check (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));

create policy "Users can update own project milestones"
  on public.project_milestones for update
  using (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));

create policy "Users can delete own project milestones"
  on public.project_milestones for delete
  using (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));

-- PROJECT ARTIFACTS policies
create policy "Users can view own project artifacts"
  on public.project_artifacts for select
  using (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));

create policy "Public can view artifacts of published projects"
  on public.project_artifacts for select
  using (exists (select 1 from public.projects where id = project_id and status = 'published'));

create policy "Users can insert own project artifacts"
  on public.project_artifacts for insert
  with check (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));

create policy "Users can update own project artifacts"
  on public.project_artifacts for update
  using (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));

create policy "Users can delete own project artifacts"
  on public.project_artifacts for delete
  using (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));

-- TAGS policies
create policy "Users can view own tags"
  on public.tags for select
  using (auth.uid() = user_id);

create policy "Public can view tags on published projects"
  on public.tags for select
  using (
    exists (
      select 1 from public.project_tags pt
      join public.projects p on p.id = pt.project_id
      where pt.tag_id = public.tags.id and p.status = 'published'
    )
  );

create policy "Users can insert own tags"
  on public.tags for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tags"
  on public.tags for update
  using (auth.uid() = user_id);

create policy "Users can delete own tags"
  on public.tags for delete
  using (auth.uid() = user_id);

-- PROJECT_TAGS policies
create policy "Users can view own project tags"
  on public.project_tags for select
  using (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));

create policy "Public can view project tags of published projects"
  on public.project_tags for select
  using (exists (select 1 from public.projects where id = project_id and status = 'published'));

create policy "Users can insert own project tags"
  on public.project_tags for insert
  with check (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));

create policy "Users can delete own project tags"
  on public.project_tags for delete
  using (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));

-- ============================================================
-- STORAGE: project artifacts bucket
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-artifacts',
  'project-artifacts',
  true,
  26214400, -- 25MB
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm',
    'application/pdf'
  ]
)
on conflict (id) do nothing;

create policy "Project artifacts are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'project-artifacts');

create policy "Users can upload their own project artifacts"
  on storage.objects for insert
  with check (bucket_id = 'project-artifacts' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update their own project artifacts"
  on storage.objects for update
  using (bucket_id = 'project-artifacts' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete their own project artifacts"
  on storage.objects for delete
  using (bucket_id = 'project-artifacts' and auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- BACKFILL
-- ============================================================
-- Existing Stage 1 projects are drafts by default (already the column
-- default), and get a summary derived from their result if empty, so
-- Projects Home has something meaningful to show immediately.
update public.projects
set summary = left(result, 200)
where summary = '' and result <> '';
