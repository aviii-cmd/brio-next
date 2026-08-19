# Brio v1.0.2 — Setup & Configuration Guide

## What changed in this release

Three areas were updated:

1. **Landing page** — Improved copy and two new sections (What You Store, How It Works, Why It Matters, Final CTA)
2. **Email verification** — Removed mandatory email confirmation so users go straight to onboarding after signup
3. **Google Sign In** — Rebuilt OAuth flow with a proper `/auth/callback` route and PKCE code exchange

---

## Required configuration (do this once before testing)

### Step 1 — Disable email confirmation in Supabase

This is the single setting that gates signup friction:

1. Open your Supabase project → **Authentication → Email**
2. Find **"Confirm email"** (or "Double confirm email change")
3. Toggle it **OFF**
4. Click **Save**

After this change, new signups will receive a session immediately and be redirected to onboarding.

> **Why this works:** When email confirmation is OFF, `supabase.auth.signUp()` returns a `session` in its response. The updated `useAuth.tsx` detects this and sets the session context immediately — no redirect to a "check your email" screen.

---

### Step 2 — Configure redirect URLs in Supabase

Every OAuth provider callback and password-reset email must point to an allowed URL.

Go to **Authentication → URL Configuration** and add:

**Site URL:**
```
https://your-production-domain.com
```
(also add `http://localhost:5173` for local dev)

**Redirect URLs (add all of these):**
```
http://localhost:5173/auth/callback
https://your-production-domain.com/auth/callback
```

> This is what the new `/auth/callback` route handles. Without these entries in the allowlist, Supabase will reject OAuth redirects as security violations.

---

### Step 3 — Enable Google OAuth in Supabase

1. Go to **Authentication → Providers → Google**
2. Toggle **Google** to **Enabled**
3. You will need a **Client ID** and **Client Secret** from Google Cloud Console (Step 4 below)
4. Copy the **Callback URL** shown in the Supabase form — you need it for Google

---

### Step 4 — Create OAuth credentials in Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Select your project (or create one)
3. Navigate to **APIs & Services → Credentials**
4. Click **+ Create Credentials → OAuth client ID**
5. Choose **Web application**
6. Set the name (e.g. "Brio")
7. Under **Authorised JavaScript origins**, add:
   ```
   http://localhost:5173
   https://your-production-domain.com
   ```
8. Under **Authorised redirect URIs**, add the Supabase callback URL:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
   (Copy this exact URL from the Supabase Google provider setup screen in Step 3)
9. Click **Create** and copy the **Client ID** and **Client Secret**
10. Paste them into the Supabase Google provider form from Step 3 and save

---

### Step 5 — Environment variables

No new environment variables are required. The existing two are sufficient:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## How the authentication flows work

### Email signup (no verification)

```
User fills signup form
  → signUp() calls supabase.auth.signUp()
  → Supabase returns { session } immediately (email confirmation OFF)
  → useAuth.tsx detects session, sets context
  → navigate({ to: "/onboarding" })
  → AuthGuard sees authenticated user, allows onboarding
```

### Google sign in

```
User clicks "Continue with Google"
  → signInWithGoogle() calls supabase.auth.signInWithOAuth()
  → Browser redirects to Google's consent screen
  → Google redirects back to: https://<supabase>.supabase.co/auth/v1/callback
  → Supabase exchanges the Google code for tokens
  → Supabase redirects to: https://your-domain.com/auth/callback?code=<pkce-code>
  → /auth/callback route calls supabase.auth.exchangeCodeForSession(code)
  → Session is established
  → Route checks profiles.onboarding_completed
  → Redirects to /onboarding (new user) or /dashboard (returning user)
```

### Email login (existing users)

```
User fills login form
  → signIn() calls supabase.auth.signInWithPassword()
  → onAuthStateChange fires with new session
  → navigate({ to: "/dashboard" })
```

---

## New files in v1.0.2

| File | Purpose |
|------|---------|
| `src/routes/auth.callback.tsx` | Handles OAuth redirect; exchanges PKCE code for session; routes to onboarding vs dashboard |

## Modified files in v1.0.2

| File | Change |
|------|--------|
| `src/routes/index.tsx` | Rewritten landing page copy; new sections: WhatYouStore, HowItWorks, WhyItMatters, FinalCTA |
| `src/routes/signup.tsx` | Removed "check your email" screen; navigates directly to `/onboarding` after signup |
| `src/hooks/useAuth.tsx` | signUp now handles immediate session; signInWithGoogle redirects to `/auth/callback`; PKCE prompt set |
| `src/routeTree.gen.ts` | `/auth/callback` route registered |

---

## Testing checklist

After completing the configuration steps above:

- [ ] **Email signup** → Fill form → lands on `/onboarding` (no email confirmation screen)
- [ ] **Google sign in** → Click button → Google consent screen → returns to app → lands on `/onboarding` or `/dashboard`
- [ ] **Email login** → Fill form → lands on `/dashboard`
- [ ] **Session persistence** → Reload page while logged in → stays logged in
- [ ] **Logout** → Click logout → session cleared → redirected to `/`
- [ ] **Protected routes** → Visit `/dashboard` logged out → redirected to `/login`
- [ ] **Already-authenticated redirect** → Visit `/login` while logged in → redirected to `/dashboard`
- [ ] **OAuth error handling** → If Google not configured → error shown on `/auth/callback` with "Back to log in" link
- [ ] **Landing page** → Loads on desktop, tablet (768px), and mobile (375px)
- [ ] **Landing page sections** → Hero, What You Store, How It Works, Features, Why It Matters, Trust, Final CTA, FAQ, Footer
- [ ] **Nav anchors** → "How it works", "What you store", "FAQ" links scroll to correct sections

---

## Common issues

**"redirect_uri_mismatch" from Google**
→ The redirect URI in Google Cloud Console doesn't match what Supabase uses.
→ Must be exactly: `https://<project-ref>.supabase.co/auth/v1/callback`

**User still sees "check your email" screen**
→ Email confirmation is still ON in Supabase.
→ Go to Authentication → Email → disable "Confirm email" and save.

**Google button does nothing / shows network error**
→ Google OAuth is not enabled in Supabase.
→ Go to Authentication → Providers → Google → Enable it and add credentials.

**Callback page shows "Authentication failed"**
→ The `code` param in the URL expired (codes are single-use, ~5 min TTL).
→ Try signing in again.

**User lands on `/dashboard` after Google sign in but profile doesn't load**
→ The `profiles` table trigger may not have fired for the new Google user.
→ Check Supabase SQL Editor → `select * from profiles` to see if a row was created.
→ The `001_initial_schema.sql` migration includes a `handle_new_user()` trigger that auto-creates the profile row on `auth.users` insert.

