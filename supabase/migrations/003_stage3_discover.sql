-- ============================================================
-- Brio — Stage 3: Discover (Opportunity Intelligence Layer)
-- Migration 003
--
-- Extends the existing schema with a full opportunity catalog,
-- a profile-driven recommendation engine, faceted search,
-- saving/feedback, and an application tracker with an
-- auto-generated checklist and profile "close-the-loop" enrichment.
--
-- Additive and backward compatible:
--  - No existing columns, tables, or policies are dropped/renamed.
--  - `profiles` gains two new *nullable* columns; every Stage 1/2
--    row keeps working exactly as before.
--  - Reuses existing conventions: uuid_generate_v4(), text+check
--    constraints instead of native enums, public.handle_updated_at(),
--    and the same "owner via auth.uid()" RLS pattern.
-- ============================================================

-- ============================================================
-- SECTION 0 — Helper functions (used by generated columns below,
-- so they must be defined first)
-- ============================================================

-- Maps a profile's academic level to a single comparable rank so
-- eligibility range checks (`grade_min <= rank <= grade_max`) are a
-- plain indexed integer comparison instead of fuzzy text matching.
create or replace function public.academic_level_rank(p_level text)
returns smallint
language sql
immutable
set search_path = public
as $$
  select case p_level
    when 'Grade 9' then 9
    when 'Grade 10' then 10
    when 'Grade 11' then 11
    when 'Grade 12' then 12
    when 'Undergraduate Year 1' then 13
    when 'Undergraduate Year 2' then 14
    when 'Undergraduate Year 3' then 15
    when 'Undergraduate Year 4' then 16
    when 'Graduate / Postgraduate' then 17
    else null
  end;
$$;

-- Reuses the same School/Regional/National/International vocabulary
-- as `achievements.level` (see 001_initial_schema.sql) so prestige on
-- an opportunity and prestige on a student's own achievements are
-- directly comparable for "stretch" matching (High-Aspirant persona).
create or replace function public.prestige_rank(p_level text)
returns smallint
language sql
immutable
set search_path = public
as $$
  select case p_level
    when 'International' then 4
    when 'National' then 3
    when 'Regional' then 2
    when 'School' then 1
    else 1
  end;
$$;

-- ============================================================
-- SECTION 1 — PROFILES: extend for eligibility matching
-- ============================================================
-- Nullable by design: a missing academic_level must never hard-fail
-- matching (PRD §10 "Ineligible User" edge case) — the app treats an
-- unset value as "unknown" and prompts the student to fill it in for
-- tighter matches, rather than silently hiding everything.
alter table public.profiles
  add column if not exists academic_level text,
  add column if not exists academic_level_rank smallint generated always as (
    public.academic_level_rank(academic_level)
  ) stored;

alter table public.profiles
  drop constraint if exists profiles_academic_level_check;
alter table public.profiles
  add constraint profiles_academic_level_check check (
    academic_level is null or academic_level in (
      'Grade 9','Grade 10','Grade 11','Grade 12',
      'Undergraduate Year 1','Undergraduate Year 2','Undergraduate Year 3','Undergraduate Year 4',
      'Graduate / Postgraduate'
    )
  );

-- ============================================================
-- SECTION 2 — OPPORTUNITIES (the catalog)
-- ============================================================
create table if not exists public.opportunities (
  id                        uuid primary key default uuid_generate_v4(),
  title                     text not null,
  organization              text not null,
  category                  text not null default 'Other',
  summary                   text not null default '',
  description               text not null default '',
  why_it_matters            text not null default '',
  difficulty                text not null default 'Intermediate',
  prestige_level            text not null default 'Regional',
  cost_type                 text not null default 'Free',
  time_commitment           text not null default '',
  duration                  text not null default '',
  location_type             text not null default 'Remote',
  country                   text,
  city                      text,
  career_track              text,
  eligibility_grade_min     smallint,
  eligibility_grade_max     smallint,
  eligibility_requirements  jsonb not null default '[]'::jsonb,
  application_steps         jsonb not null default '[]'::jsonb,
  preparation_resources     jsonb not null default '[]'::jsonb,
  required_skills           text[] not null default '{}',
  tags                      text[] not null default '{}',
  application_url           text,
  application_deadline      timestamptz,
  rolling_deadline          boolean not null default false,
  saves_count               integer not null default 0,
  views_count               integer not null default 0,
  is_active                 boolean not null default true,
  source                    text not null default 'internal',
  search_vector             tsvector,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint opportunities_category_check check (category in (
    'Competition','Internship','Fellowship','Scholarship','Research Program',
    'Hackathon','Volunteering','Course','Grant','Mentorship','Other'
  )),
  constraint opportunities_difficulty_check check (difficulty in ('Beginner','Intermediate','Advanced')),
  constraint opportunities_prestige_check check (prestige_level in ('School','Regional','National','International')),
  constraint opportunities_cost_check check (cost_type in ('Free','Stipend','Paid','Fee-required')),
  constraint opportunities_location_type_check check (location_type in ('Remote','Onsite','Hybrid')),
  constraint opportunities_career_track_check check (
    career_track is null or career_track in ('Founder','Researcher','Engineer','Creative','Analyst','Leader','Advocate')
  ),
  constraint opportunities_grade_range_check check (
    eligibility_grade_min is null or eligibility_grade_max is null or eligibility_grade_max >= eligibility_grade_min
  )
);

-- Query patterns this needs to serve fast, even at 500k+ rows:
--  - "active + upcoming deadline" scans for Discover Home / recommendations
--  - facet filters (category, location, cost, difficulty, prestige, country)
--  - array-containment lookups for skills/tags (recommendation + filters)
--  - full text search across title/org/category/description
create index if not exists opportunities_active_deadline_idx on public.opportunities(is_active, application_deadline);
create index if not exists opportunities_category_idx on public.opportunities(category);
create index if not exists opportunities_country_idx on public.opportunities(country);
create index if not exists opportunities_difficulty_idx on public.opportunities(difficulty);
create index if not exists opportunities_prestige_idx on public.opportunities(prestige_level);
create index if not exists opportunities_cost_idx on public.opportunities(cost_type);
create index if not exists opportunities_career_track_idx on public.opportunities(career_track);
create index if not exists opportunities_grade_min_idx on public.opportunities(eligibility_grade_min);
create index if not exists opportunities_grade_max_idx on public.opportunities(eligibility_grade_max);
create index if not exists opportunities_tags_gin_idx on public.opportunities using gin(tags);
create index if not exists opportunities_required_skills_gin_idx on public.opportunities using gin(required_skills);
create index if not exists opportunities_search_vector_idx on public.opportunities using gin(search_vector);
-- Keyset pagination for "load more" in Search, ordered soonest-deadline-first.
create index if not exists opportunities_keyset_idx on public.opportunities(is_active, application_deadline, id) where is_active = true;

create trigger trg_opportunities_updated_at
  before update on public.opportunities
  for each row execute function public.handle_updated_at();

-- Full text search vector, kept in sync via the built-in trigger helper
-- (a plain trigger rather than a GENERATED column, since to_tsvector()
-- is not IMMUTABLE and Postgres will reject it in a generated expression).
create trigger trg_opportunities_search_vector
  before insert or update on public.opportunities
  for each row execute function
  tsvector_update_trigger(search_vector, 'pg_catalog.english', title, organization, category, description);

-- ============================================================
-- SECTION 3 — OPPORTUNITY VIEWS (behavioral signal + "Continue Exploring")
-- ============================================================
create table if not exists public.opportunity_views (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  opportunity_id  uuid not null references public.opportunities(id) on delete cascade,
  viewed_at       timestamptz not null default now(),
  view_count      integer not null default 1,
  unique (user_id, opportunity_id)
);
create index if not exists opportunity_views_user_recent_idx on public.opportunity_views(user_id, viewed_at desc);

-- ============================================================
-- SECTION 4 — SAVED OPPORTUNITIES
-- ============================================================
create table if not exists public.saved_opportunities (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  opportunity_id  uuid not null references public.opportunities(id) on delete cascade,
  note            text not null default '',
  created_at      timestamptz not null default now(),
  unique (user_id, opportunity_id)
);
create index if not exists saved_opportunities_user_idx on public.saved_opportunities(user_id, created_at desc);

-- Denormalized counter, kept accurate via trigger, so "Trending with
-- peers" / recommendation scoring never needs a count(*) scan.
create or replace function public.handle_save_count_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.opportunities set saves_count = saves_count + 1 where id = new.opportunity_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.opportunities set saves_count = greatest(saves_count - 1, 0) where id = old.opportunity_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger trg_saved_opportunities_count
  after insert or delete on public.saved_opportunities
  for each row execute function public.handle_save_count_change();

-- ============================================================
-- SECTION 5 — OPPORTUNITY FEEDBACK ("Not relevant" / interest signal)
-- ============================================================
create table if not exists public.opportunity_feedback (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  opportunity_id  uuid not null references public.opportunities(id) on delete cascade,
  feedback        text not null,
  created_at      timestamptz not null default now(),
  constraint opportunity_feedback_value_check check (feedback in ('not_relevant', 'interested')),
  unique (user_id, opportunity_id)
);
create index if not exists opportunity_feedback_user_idx on public.opportunity_feedback(user_id);

-- ============================================================
-- SECTION 6 — APPLICATION TRACKER
-- ============================================================
create table if not exists public.applications (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  opportunity_id  uuid not null references public.opportunities(id) on delete cascade,
  status          text not null default 'planning',
  notes           text not null default '',
  sort_order      integer not null default 0,
  applied_at      timestamptz,
  decision_at     timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint applications_status_check check (
    status in ('planning','preparing','applied','interview','accepted','rejected','completed')
  ),
  unique (user_id, opportunity_id)
);
create index if not exists applications_user_status_idx on public.applications(user_id, status);
create index if not exists applications_opportunity_idx on public.applications(opportunity_id);

create trigger trg_applications_updated_at
  before update on public.applications
  for each row execute function public.handle_updated_at();

-- Stamps applied_at / decision_at / completed_at automatically as a
-- card moves across the Kanban board, so the UI never has to guess
-- "when did this actually happen" and Timeliness (PRD §12) is exact.
-- Fires on INSERT too: "Mark as Applied" creates the row with
-- status = 'applied' directly, skipping 'planning' entirely, and that
-- still needs applied_at stamped. OLD is unassigned during INSERT, so
-- the two cases are handled in separate branches rather than by
-- comparing against OLD unconditionally.
create or replace function public.handle_application_status_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'applied' and new.applied_at is null then
      new.applied_at := now();
    end if;
    if new.status in ('accepted', 'rejected') and new.decision_at is null then
      new.decision_at := now();
    end if;
    if new.status = 'completed' and new.completed_at is null then
      new.completed_at := now();
    end if;
  elsif new.status is distinct from old.status then
    if new.status = 'applied' and old.applied_at is null then
      new.applied_at := now();
    end if;
    if new.status in ('accepted', 'rejected') and old.decision_at is null then
      new.decision_at := now();
    end if;
    if new.status = 'completed' and old.completed_at is null then
      new.completed_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_applications_status_change
  before insert or update on public.applications
  for each row execute function public.handle_application_status_change();

-- "Close the Loop" (PRD §1 objective + §12 Profile Enrichment metric):
-- completing an application automatically adds an Achievement and
-- merges the opportunity's required skills into the student's Skills
-- section, with evidence linking back to the opportunity. Handles both
-- an existing application moving to 'completed' (UPDATE) and one being
-- created already-completed (INSERT, e.g. a future bulk-import/backfill
-- tool) — the two are branched explicitly since OLD isn't assigned yet
-- during INSERT.
create or replace function public.handle_application_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_opp public.opportunities%rowtype;
  v_skill text;
  v_is_new_completion boolean;
begin
  if tg_op = 'INSERT' then
    v_is_new_completion := new.status = 'completed';
  else
    v_is_new_completion := new.status = 'completed' and old.status is distinct from 'completed';
  end if;

  if v_is_new_completion then
    select * into v_opp from public.opportunities where id = new.opportunity_id;
    if not found then
      return new;
    end if;

    insert into public.achievements (user_id, name, issuer, year, level, description)
    values (
      new.user_id,
      v_opp.title,
      v_opp.organization,
      extract(year from now())::int,
      v_opp.prestige_level,
      'Completed via Brio Discover — ' || v_opp.category
    );

    if v_opp.required_skills is not null then
      foreach v_skill in array v_opp.required_skills loop
        insert into public.skills (user_id, name, category, source, linked_to)
        values (new.user_id, v_skill, 'Technical', 'opportunity', array[v_opp.title])
        on conflict (user_id, name) do update set
          source = case when public.skills.source = 'manual' then public.skills.source else 'opportunity' end,
          linked_to = (
            select array_agg(distinct x) from unnest(public.skills.linked_to || array[v_opp.title]) as x
          );
      end loop;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_application_completion
  after insert or update on public.applications
  for each row execute function public.handle_application_completion();

-- ============================================================
-- SECTION 7 — APPLICATION CHECKLIST ITEMS (auto-generated + manual)
-- ============================================================
create table if not exists public.application_checklist_items (
  id              uuid primary key default uuid_generate_v4(),
  application_id  uuid not null references public.applications(id) on delete cascade,
  title           text not null,
  description     text not null default '',
  is_complete     boolean not null default false,
  due_date        timestamptz,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists application_checklist_items_application_idx on public.application_checklist_items(application_id);

create trigger trg_application_checklist_items_updated_at
  before update on public.application_checklist_items
  for each row execute function public.handle_updated_at();

-- ============================================================
-- SECTION 8 — THEMATIC COLLECTIONS ("Beginner AI competitions", etc.)
-- ============================================================
create table if not exists public.opportunity_collections (
  id            uuid primary key default uuid_generate_v4(),
  slug          text not null unique,
  title         text not null,
  description   text not null default '',
  icon          text not null default 'Sparkles',
  sort_order    integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_opportunity_collections_updated_at
  before update on public.opportunity_collections
  for each row execute function public.handle_updated_at();

create table if not exists public.opportunity_collection_items (
  collection_id   uuid not null references public.opportunity_collections(id) on delete cascade,
  opportunity_id  uuid not null references public.opportunities(id) on delete cascade,
  sort_order      integer not null default 0,
  primary key (collection_id, opportunity_id)
);
create index if not exists opportunity_collection_items_collection_idx on public.opportunity_collection_items(collection_id, sort_order);

-- ============================================================
-- SECTION 9 — RECOMMENDATION ENGINE
-- ============================================================
-- Hybrid content-based + collaborative scoring, computed entirely in
-- SQL so it stays fast as the catalog grows into the hundreds of
-- thousands of rows: the `eligible` CTE narrows via indexed columns
-- first (is_active, deadline, grade range, country) and only the
-- resulting handful of rows are scored/sorted — never a full table
-- scan of the catalog. The client (recommendationService, see
-- src/services/discover.ts) treats this as a black box and only
-- formats the `matched_skills` / `matched_tags` it gets back into
-- "Because you added Python as a skill" explainability copy.
create or replace function public.recommend_opportunities(
  p_user_id uuid,
  p_limit integer default 30
)
returns table (
  opportunity_id uuid,
  score numeric,
  matched_skills text[],
  matched_tags text[],
  is_exploration boolean
)
language plpgsql
set search_path = public
as $$
declare
  v_grade_rank smallint;
  v_location text;
  v_skills_lower text[];
  v_tags_lower text[];
  v_prestige_rank smallint;
  v_explore_limit integer;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'not authorized';
  end if;

  select academic_level_rank, nullif(trim(location), '')
  into v_grade_rank, v_location
  from public.profiles where id = p_user_id;

  select coalesce(array_agg(distinct lower(name)), '{}')
  into v_skills_lower
  from public.skills where user_id = p_user_id;

  select coalesce(array_agg(distinct lower(t.name)), '{}')
  into v_tags_lower
  from public.tags t where t.user_id = p_user_id and t.type in ('domain', 'tech');

  select coalesce(max(public.prestige_rank(level)), 1)
  into v_prestige_rank
  from public.achievements where user_id = p_user_id;

  p_limit := greatest(coalesce(p_limit, 30), 1);
  v_explore_limit := greatest(p_limit / 10, 1);

  return query
  with eligible as (
    select o.*
    from public.opportunities o
    where o.is_active = true
      and (o.rolling_deadline = true or o.application_deadline is null or o.application_deadline > now())
      and (o.eligibility_grade_min is null or v_grade_rank is null or o.eligibility_grade_min <= v_grade_rank)
      and (o.eligibility_grade_max is null or v_grade_rank is null or o.eligibility_grade_max >= v_grade_rank)
      and (o.country is null or v_location is null or v_location ilike '%' || o.country || '%')
      and not exists (
        select 1 from public.opportunity_feedback f
        where f.opportunity_id = o.id and f.user_id = p_user_id and f.feedback = 'not_relevant'
      )
      and not exists (
        select 1 from public.applications a
        where a.opportunity_id = o.id and a.user_id = p_user_id
      )
  ),
  matches as (
    select
      e.*,
      array(select rs from unnest(e.required_skills) rs where lower(rs) = any(v_skills_lower)) as m_skills,
      array(select tg from unnest(e.tags) tg where lower(tg) = any(v_tags_lower)) as m_tags
    from eligible e
  ),
  scored as (
    select
      m.id as s_opportunity_id,
      (
        coalesce(array_length(m.m_skills, 1), 0) * 10.0
        + coalesce(array_length(m.m_tags, 1), 0) * 6.0
        + (case when public.prestige_rank(m.prestige_level) <= v_prestige_rank + 1 then 3.0 else 0.0 end)
        + (case
            when m.rolling_deadline or m.application_deadline is null then 0.0
            when m.application_deadline < now() + interval '3 days' then 5.0
            when m.application_deadline < now() + interval '7 days' then 3.5
            when m.application_deadline < now() + interval '14 days' then 2.0
            else 0.0
          end)
        + ln(1 + m.saves_count) * 1.5
        + ln(1 + m.views_count) * 0.5
        + random() * 0.75
      )::numeric as s_score,
      m.m_skills as s_matched_skills,
      m.m_tags as s_matched_tags
    from matches m
  ),
  ranked as (
    select scored.*, row_number() over (order by s_score desc) as rn
    from scored
  ),
  top_picks as (
    select s_opportunity_id, s_score, s_matched_skills, s_matched_tags, false as s_is_exploration
    from ranked
    where rn <= greatest(p_limit - v_explore_limit, 1)
  ),
  exploration as (
    select e.id, 0::numeric, '{}'::text[], '{}'::text[], true
    from eligible e
    where e.id not in (select s_opportunity_id from top_picks)
    order by random()
    limit v_explore_limit
  )
  select * from top_picks
  union all
  select * from exploration;
end;
$$;

grant execute on function public.recommend_opportunities(uuid, integer) to authenticated;

-- Logs a view (upsert) and bumps the denormalized popularity counter.
-- SECURITY DEFINER is required only for the counter bump (regular
-- students have no UPDATE grant on the shared `opportunities` catalog);
-- the identity check below keeps it from being used to log views on
-- another student's behalf.
create or replace function public.log_opportunity_view(p_user_id uuid, p_opportunity_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'not authorized';
  end if;

  insert into public.opportunity_views (user_id, opportunity_id, viewed_at, view_count)
  values (p_user_id, p_opportunity_id, now(), 1)
  on conflict (user_id, opportunity_id)
  do update set viewed_at = now(), view_count = public.opportunity_views.view_count + 1;

  update public.opportunities set views_count = views_count + 1 where id = p_opportunity_id;
end;
$$;

grant execute on function public.log_opportunity_view(uuid, uuid) to authenticated;

-- Creates (or reactivates) a tracked application and auto-generates its
-- checklist from the opportunity's `application_steps` the first time
-- ("Auto-generated preparation checklists", PRD §11 Nice-to-Have). Runs
-- as the calling student (not SECURITY DEFINER) since every row it
-- touches is already owned by that student and covered by RLS below.
create or replace function public.create_application(
  p_user_id uuid,
  p_opportunity_id uuid,
  p_status text default 'planning'
)
returns public.applications
language plpgsql
set search_path = public
as $$
declare
  v_app public.applications%rowtype;
  v_steps jsonb;
  v_step jsonb;
  v_idx integer := 0;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'not authorized';
  end if;

  insert into public.applications (user_id, opportunity_id, status)
  values (p_user_id, p_opportunity_id, coalesce(p_status, 'planning'))
  on conflict (user_id, opportunity_id) do update set status = public.applications.status
  returning * into v_app;

  select application_steps into v_steps from public.opportunities where id = p_opportunity_id;

  if v_steps is not null and jsonb_typeof(v_steps) = 'array' and jsonb_array_length(v_steps) > 0
     and not exists (select 1 from public.application_checklist_items where application_id = v_app.id) then
    for v_step in select * from jsonb_array_elements(v_steps) loop
      insert into public.application_checklist_items (application_id, title, description, sort_order)
      values (
        v_app.id,
        coalesce(nullif(v_step->>'title', ''), 'Step ' || (v_idx + 1)),
        coalesce(v_step->>'description', ''),
        v_idx
      );
      v_idx := v_idx + 1;
    end loop;
  end if;

  return v_app;
end;
$$;

grant execute on function public.create_application(uuid, uuid, text) to authenticated;

-- ============================================================
-- SECTION 10 — ROW LEVEL SECURITY
-- ============================================================
alter table public.opportunities enable row level security;
alter table public.opportunity_views enable row level security;
alter table public.saved_opportunities enable row level security;
alter table public.opportunity_feedback enable row level security;
alter table public.applications enable row level security;
alter table public.application_checklist_items enable row level security;
alter table public.opportunity_collections enable row level security;
alter table public.opportunity_collection_items enable row level security;

-- OPPORTUNITIES: shared read-only catalog. Content is managed out of
-- band (Supabase Studio / service role import), matching the fact that
-- there is no in-app authoring UI for the catalog — students only read.
create policy "Authenticated users can view active opportunities"
  on public.opportunities for select
  to authenticated
  using (is_active = true);

create policy "Users can view opportunities they have saved or tracked"
  on public.opportunities for select
  to authenticated
  using (
    exists (select 1 from public.saved_opportunities s where s.opportunity_id = opportunities.id and s.user_id = auth.uid())
    or exists (select 1 from public.applications a where a.opportunity_id = opportunities.id and a.user_id = auth.uid())
  );

-- OPPORTUNITY_VIEWS policies
create policy "Users can view own opportunity views"
  on public.opportunity_views for select
  using (auth.uid() = user_id);

create policy "Users can insert own opportunity views"
  on public.opportunity_views for insert
  with check (auth.uid() = user_id);

create policy "Users can update own opportunity views"
  on public.opportunity_views for update
  using (auth.uid() = user_id);

-- SAVED_OPPORTUNITIES policies
create policy "Users can view own saved opportunities"
  on public.saved_opportunities for select
  using (auth.uid() = user_id);

create policy "Users can save opportunities"
  on public.saved_opportunities for insert
  with check (auth.uid() = user_id);

create policy "Users can update own saved opportunities"
  on public.saved_opportunities for update
  using (auth.uid() = user_id);

create policy "Users can remove own saved opportunities"
  on public.saved_opportunities for delete
  using (auth.uid() = user_id);

-- OPPORTUNITY_FEEDBACK policies
create policy "Users can view own opportunity feedback"
  on public.opportunity_feedback for select
  using (auth.uid() = user_id);

create policy "Users can submit opportunity feedback"
  on public.opportunity_feedback for insert
  with check (auth.uid() = user_id);

create policy "Users can update own opportunity feedback"
  on public.opportunity_feedback for update
  using (auth.uid() = user_id);

create policy "Users can delete own opportunity feedback"
  on public.opportunity_feedback for delete
  using (auth.uid() = user_id);

-- APPLICATIONS policies
create policy "Users can view own applications"
  on public.applications for select
  using (auth.uid() = user_id);

create policy "Users can create own applications"
  on public.applications for insert
  with check (auth.uid() = user_id);

create policy "Users can update own applications"
  on public.applications for update
  using (auth.uid() = user_id);

create policy "Users can delete own applications"
  on public.applications for delete
  using (auth.uid() = user_id);

-- APPLICATION_CHECKLIST_ITEMS policies (ownership via parent application)
create policy "Users can view own application checklist items"
  on public.application_checklist_items for select
  using (exists (select 1 from public.applications where id = application_id and user_id = auth.uid()));

create policy "Users can insert own application checklist items"
  on public.application_checklist_items for insert
  with check (exists (select 1 from public.applications where id = application_id and user_id = auth.uid()));

create policy "Users can update own application checklist items"
  on public.application_checklist_items for update
  using (exists (select 1 from public.applications where id = application_id and user_id = auth.uid()));

create policy "Users can delete own application checklist items"
  on public.application_checklist_items for delete
  using (exists (select 1 from public.applications where id = application_id and user_id = auth.uid()));

-- OPPORTUNITY_COLLECTIONS / ITEMS: shared read-only, same pattern as opportunities.
create policy "Authenticated users can view active collections"
  on public.opportunity_collections for select
  to authenticated
  using (is_active = true);

create policy "Authenticated users can view collection items"
  on public.opportunity_collection_items for select
  to authenticated
  using (
    exists (select 1 from public.opportunity_collections c where c.id = collection_id and c.is_active = true)
  );
