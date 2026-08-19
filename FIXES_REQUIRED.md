# Brio — Two Fixes Required in Supabase Dashboard

Both errors you're seeing are Supabase **dashboard settings** that need to be changed.
No more code changes required.

---

## Bug 1 — "Email not confirmed" on login

### Why it happens
Your Supabase project still has **"Confirm email"** turned ON.
Users who signed up before you make the change already have unconfirmed accounts.

### Fix A — Turn off email confirmation (for all new signups)

1. Go to your Supabase project → **Authentication**
2. Click **"Email"** in the left sub-menu (under Providers)
3. Find the toggle: **"Confirm email"**
4. Turn it **OFF** ← this is the one
5. Click **Save**

```
Authentication → Providers → Email → "Confirm email" toggle → OFF → Save
```

### Fix B — Confirm existing accounts that are stuck (for users already signed up)

For any account already created with an unconfirmed email, go to:

1. **Authentication → Users**
2. Find the user (e.g. aviral.121212@gmail.com)
3. Click the three-dot menu on the right
4. Click **"Send confirmation email"** OR click the user row and find **"Confirm email manually"**

Alternatively — the login page now shows a **"Resend confirmation email →"** link
when this error occurs, so users can self-serve without you touching the dashboard.

---

## Bug 2 — Black screen / "Unsupported provider: provider is not enabled"

### Why it happens
Google OAuth is not enabled in your Supabase project.
The code is correct — the provider just needs to be switched on.

### Step 1 — Enable Google in Supabase

1. Go to **Authentication → Providers**
2. Find **Google** in the list
3. Toggle it **ON** (the toggle turns blue)
4. Copy the **"Callback URL (for OAuth)"** shown — you need it in Step 2
   It looks like: `https://xxxxxxxxxxxx.supabase.co/auth/v1/callback`
5. Leave this page open

### Step 2 — Create OAuth credentials in Google Cloud Console

1. Go to → https://console.cloud.google.com
2. Select your project (or create one named "Brio")
3. Navigate to **APIs & Services → Credentials**
4. Click **"+ Create Credentials" → "OAuth client ID"**
5. Application type: **Web application**
6. Name: `Brio`
7. Under **"Authorised JavaScript origins"**, add:
   - `http://localhost:5173`
   - `https://your-production-domain.com` (your real domain)
8. Under **"Authorised redirect URIs"**, paste the Supabase callback URL from Step 1:
   - `https://xxxxxxxxxxxx.supabase.co/auth/v1/callback`
9. Click **Create**
10. Copy the **Client ID** and **Client Secret** shown in the popup

### Step 3 — Paste credentials back into Supabase

1. Return to the Supabase Google provider page from Step 1
2. Paste **Client ID** into "Client ID (for OAuth)"
3. Paste **Client Secret** into "Client Secret (for OAuth)"
4. Click **Save**

### Step 4 — Add redirect URL to Supabase allowlist

1. In Supabase → **Authentication → URL Configuration**
2. Under **"Redirect URLs"**, add:
   - `http://localhost:5173/auth/callback`
   - `https://your-production-domain.com/auth/callback`
3. Click **Save**

---

## After making these changes

Test in this order:

1. **New signup** → should go straight to /onboarding (no email check)
2. **Google sign in** → should open Google chooser → land in /onboarding or /dashboard
3. **Existing user login** (the aviral.121212 account) → if still blocked, use the
   "Resend confirmation email" link on the login page, confirm via email, then log in

---

## Summary

| Error | Root Cause | Fix location |
|-------|-----------|-------------|
| "Email not confirmed" | Confirm email toggle is ON | Supabase → Auth → Email → toggle OFF |
| "Unsupported provider" | Google not enabled | Supabase → Auth → Providers → Google → toggle ON + add credentials |
