# Brio — Professional Identity Platform

A premium professional identity platform for ambitious students. One profile powers your resume, portfolio, projects, and achievements.

---

## Stack

- **Frontend**: React 19, TanStack Router, TanStack Query, TypeScript
- **Backend**: Supabase (Postgres + Auth + Storage + RLS)
- **Forms**: React Hook Form + Zod
- **Styling**: Tailwind CSS v4
- **Build**: Vite 8

---

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Run the database migrations

In your Supabase dashboard → **SQL Editor**, paste and run the contents of, in order:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_stage2_projects_workspace.sql
```

The first creates the core tables, RLS policies, triggers, and storage buckets. The second adds the Stage 2 Projects Workspace (milestones, artifacts, tags, publishing) — see `SETUP_STAGE2.md` for details.

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values from **Project Settings → API**:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Enable Auth providers (optional)

To enable Google login: Supabase Dashboard → **Authentication → Providers → Google**.

### 5. Install and run

```bash
npm install
npm run dev
```

---

## Architecture

```
src/
  hooks/
    useAuth.tsx       # Auth context + provider
    useData.ts        # All React Query hooks (CRUD)
  services/
    api.ts            # Supabase service functions + completion calc
  types/
    database.ts       # Full TypeScript types for DB schema
  lib/
    supabase.ts       # Supabase client
    schemas.ts        # Zod validation schemas
  routes/
    __root.tsx        # Root layout + QueryClientProvider + AuthProvider
    index.tsx         # Landing page
    login.tsx         # Auth-guarded login
    signup.tsx        # Auth-guarded signup
    forgot-password.tsx
    onboarding.tsx    # Persisted onboarding (draft saved to DB)
    dashboard/        # All dashboard routes — all data from Supabase
    settings.tsx      # Profile edit, password change, privacy
  components/brio/
    AuthGuard.tsx     # Route-level auth protection
    DashboardShell.tsx
    Drawer.tsx
    ui.tsx
supabase/
  migrations/
    001_initial_schema.sql  # Full schema + RLS + storage
```

---

## Database Schema

| Table | Description |
|---|---|
| `profiles` | One row per user, auto-created on signup |
| `projects` | PAR-structured project entries |
| `experience` | Roles with bullet points |
| `education` | Institutions, degrees, coursework |
| `achievements` | Awards with level signals |
| `skills` | Manual + project-derived skills |
| `onboarding_drafts` | Persisted onboarding state |

All tables have UUID primary keys, `created_at`/`updated_at` timestamps, cascade deletes, and Row Level Security policies.

---

## Security

- All tables protected by RLS — users can only access their own data
- Storage buckets scoped to user folders
- No service role key in client code
- Auth session persisted and auto-refreshed by Supabase client

---

## Export Architecture

The Output page provides:
- **JSON export** — structured data download, works today
- **Shareable URL** — `/profile/{userId}` (requires public profile toggle)
- **PDF generation** — architecture in place, server function ready to wire up

---

## Profile Completion

Calculated client-side in `services/api.ts → calculateProfileCompletion()`:
- Profile fields: 40 points (name, school, program, goal, location, avatar)
- Content sections: 60 points (projects, experience, education, achievements, skills)
