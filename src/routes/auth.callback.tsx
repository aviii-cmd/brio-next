/**
 * /auth/callback
 *
 * Supabase redirects here after a successful OAuth flow (Google, etc.).
 * The URL contains either:
 *   - A `code` query param (PKCE flow) — we exchange it for a session, OR
 *   - An `access_token` fragment (implicit flow) — Supabase client handles it
 *     automatically via detectSessionInUrl: true in supabase.ts.
 *
 * After the session is established we redirect the user to /onboarding (new
 * accounts) or /dashboard (returning accounts). The auth state change listener
 * in useAuth sets the session in React context so protected routes open cleanly.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Signing in — Brio" }] }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      // exchangeCodeForSession handles the PKCE `?code=` param.
      // For implicit flows (fragment-based), detectSessionInUrl in the client
      // config already picked up the session automatically.
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const errorParam = params.get("error");
      const errorDescription = params.get("error_description");

      // Surface OAuth errors returned by the provider
      if (errorParam) {
        if (!cancelled) setError(errorDescription ?? errorParam);
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError && !cancelled) {
          setError(exchangeError.message);
          return;
        }
      }

      // At this point either the code was exchanged or the session was implicit.
      // Fetch the current session to decide where to send the user.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session && !cancelled) {
        setError("Authentication failed. Please try again.");
        return;
      }

      if (cancelled) return;

      // Check if this user has completed onboarding
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", session.user.id)
          .single();

        const destination = profile?.onboarding_completed ? "/dashboard" : "/onboarding";
        navigate({ to: destination, replace: true });
      } else {
        navigate({ to: "/dashboard", replace: true });
      }
    }

    handleCallback();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--surface)] px-4">
        <div
          className="w-full max-w-[400px] rounded-md border border-[var(--surface-3)] bg-white p-8 text-center"
          style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
        >
          <div className="mb-4 font-serif text-[22px] font-semibold tracking-[-0.02em] text-[var(--ink)]">
            Brio
          </div>
          <p className="text-[15px] font-medium text-[var(--ink)]">Sign in failed</p>
          <p className="mt-2 text-[13px] text-[var(--ink-2)]">{error}</p>
          <a
            href="/login"
            className="mt-6 inline-flex h-9 items-center justify-center rounded-[4px] border border-[var(--surface-3)] bg-white px-4 text-[13px] font-medium text-[var(--ink)] transition-colors hover:bg-[var(--surface-2)]"
          >
            Back to log in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--surface)]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--surface-3)] border-t-[var(--ink)]" />
        <p className="text-[13px] text-[var(--ink-3)]">Signing in…</p>
      </div>
    </div>
  );
}
