-- ============================================================
-- Brio — Initial Schema
-- Migration 001
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  name           text not null default '',
  initials       text generated always as (
    case
      when name = '' then '?'
      when position(' ' in name) > 0
        then upper(substring(name, 1, 1)) || upper(substring(name, position(' ' in name) + 1, 1))
      else upper(substring(name, 1, 2))
    end
  ) stored,
  email          text,
  school         text not null default '',
  program        text not null default '',
  graduation_year text not null default '',
  location       text not null default '',
  goal           text not null default '',
  intent         text not null default '',
  avatar_url     text,
  onboarding_completed boolean not null default false,
  onboarding_step      integer not null default 1,
  onboarding_intent    text,
  is_public      boolean not null default true,
  show_in_search boolean not null default false,
  allow_resume_requests boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ============================================================
-- PROJECTS
-- ============================================================
create table public.projects (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  type       text not null default 'Personal Project',
  date       text not null default '',
  start_year integer,
  url        text,
  featured   boolean not null default false,
  problem    text not null default '',
  action     text not null default '',
  result     text not null default '',
  skills     text[] not null default '{}',
  role       text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_user_id_idx on public.projects(user_id);
create index projects_featured_idx on public.projects(user_id, featured);

-- ============================================================
-- EXPERIENCE
-- ============================================================
create table public.experience (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  org        text not null,
  role       text not null,
  type       text not null default 'Internship',
  start_date text not null default '',
  end_date   text not null default '',
  is_current boolean not null default false,
  location   text not null default '',
  bullets    text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index experience_user_id_idx on public.experience(user_id);

-- ============================================================
-- EDUCATION
-- ============================================================
create table public.education (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  institution  text not null,
  program      text not null,
  field        text not null default '',
  start_year   text not null default '',
  end_year     text not null default '',
  gpa          text,
  coursework   text[] not null default '{}',
  is_current   boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index education_user_id_idx on public.education(user_id);

-- ============================================================
-- ACHIEVEMENTS
-- ============================================================
create table public.achievements (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  issuer      text not null,
  year        integer not null,
  level       text not null default 'School',
  description text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint achievements_level_check check (level in ('School','Regional','National','International'))
);
create index achievements_user_id_idx on public.achievements(user_id);

-- ============================================================
-- SKILLS (derived + manual)
-- ============================================================
create table public.skills (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  category   text not null default 'Technical',
  source     text not null default 'manual',
  linked_to  text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint skills_category_check check (category in ('Technical','Tools','Soft')),
  unique(user_id, name)
);
create index skills_user_id_idx on public.skills(user_id);

-- ============================================================
-- ONBOARDING DRAFT (persisted between sessions)
-- ============================================================
create table public.onboarding_drafts (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade unique,
  step         integer not null default 1,
  intent       text,
  name         text,
  school       text,
  graduation_year text,
  goal         text,
  first_project jsonb,
  first_experience jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.handle_updated_at();

create trigger trg_experience_updated_at
  before update on public.experience
  for each row execute function public.handle_updated_at();

create trigger trg_education_updated_at
  before update on public.education
  for each row execute function public.handle_updated_at();

create trigger trg_achievements_updated_at
  before update on public.achievements
  for each row execute function public.handle_updated_at();

create trigger trg_skills_updated_at
  before update on public.skills
  for each row execute function public.handle_updated_at();

create trigger trg_onboarding_drafts_updated_at
  before update on public.onboarding_drafts
  for each row execute function public.handle_updated_at();

-- ============================================================
-- NEW USER PROFILE TRIGGER
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  full_name text;
begin
  full_name := coalesce(new.raw_user_meta_data->>'full_name', '');
  insert into public.profiles (id, name, email)
  values (new.id, full_name, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.experience enable row level security;
alter table public.education enable row level security;
alter table public.achievements enable row level security;
alter table public.skills enable row level security;
alter table public.onboarding_drafts enable row level security;

-- PROFILES policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Public profiles are viewable by anyone"
  on public.profiles for select
  using (is_public = true);

-- PROJECTS policies
create policy "Users can view own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Users can insert own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- EXPERIENCE policies
create policy "Users can view own experience"
  on public.experience for select
  using (auth.uid() = user_id);

create policy "Users can insert own experience"
  on public.experience for insert
  with check (auth.uid() = user_id);

create policy "Users can update own experience"
  on public.experience for update
  using (auth.uid() = user_id);

create policy "Users can delete own experience"
  on public.experience for delete
  using (auth.uid() = user_id);

-- EDUCATION policies
create policy "Users can view own education"
  on public.education for select
  using (auth.uid() = user_id);

create policy "Users can insert own education"
  on public.education for insert
  with check (auth.uid() = user_id);

create policy "Users can update own education"
  on public.education for update
  using (auth.uid() = user_id);

create policy "Users can delete own education"
  on public.education for delete
  using (auth.uid() = user_id);

-- ACHIEVEMENTS policies
create policy "Users can view own achievements"
  on public.achievements for select
  using (auth.uid() = user_id);

create policy "Users can insert own achievements"
  on public.achievements for insert
  with check (auth.uid() = user_id);

create policy "Users can update own achievements"
  on public.achievements for update
  using (auth.uid() = user_id);

create policy "Users can delete own achievements"
  on public.achievements for delete
  using (auth.uid() = user_id);

-- SKILLS policies
create policy "Users can view own skills"
  on public.skills for select
  using (auth.uid() = user_id);

create policy "Users can insert own skills"
  on public.skills for insert
  with check (auth.uid() = user_id);

create policy "Users can update own skills"
  on public.skills for update
  using (auth.uid() = user_id);

create policy "Users can delete own skills"
  on public.skills for delete
  using (auth.uid() = user_id);

-- ONBOARDING DRAFTS policies
create policy "Users can view own onboarding draft"
  on public.onboarding_drafts for select
  using (auth.uid() = user_id);

create policy "Users can upsert own onboarding draft"
  on public.onboarding_drafts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own onboarding draft"
  on public.onboarding_drafts for update
  using (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif']),
  ('documents', 'documents', false, 10485760, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do nothing;

-- Storage RLS
create policy "Avatars are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can access own documents"
  on storage.objects for select
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can upload own documents"
  on storage.objects for insert
  with check (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own documents"
  on storage.objects for delete
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);
