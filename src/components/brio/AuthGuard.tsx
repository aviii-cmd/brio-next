import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";

interface AuthGuardProps {
  children: React.ReactNode;
  /** If true, redirect authenticated users away (e.g. login page) */
  redirectIfAuthenticated?: boolean;
}

export function AuthGuard({ children, redirectIfAuthenticated = false }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;

    if (!user && !redirectIfAuthenticated) {
      // Not authenticated — go to login, preserving redirect destination
      navigate({ to: "/login", search: { redirect: pathname } });
    } else if (user && redirectIfAuthenticated) {
      // Already authenticated — go to dashboard
      navigate({ to: "/dashboard" });
    }
  }, [user, loading, redirectIfAuthenticated, navigate, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--surface)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--surface-3)] border-t-[var(--ink)]" />
          <p className="text-[13px] text-[var(--ink-3)]">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user && !redirectIfAuthenticated) return null;
  if (user && redirectIfAuthenticated) return null;

  return <>{children}</>;
}
