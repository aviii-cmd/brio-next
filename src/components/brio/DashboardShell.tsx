import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import * as React from "react";
import {
  LayoutDashboard,
  Compass,
  Folders,
  Briefcase,
  GraduationCap,
  Award,
  Sparkles,
  GitCommitVertical,
  Download,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Avatar } from "./ui";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useProfileCounts, useProfileCompletion, useCreateProject } from "@/hooks/useData";
import { AuthGuard } from "./AuthGuard";
import { useMobileNav } from "@/hooks/useMobileNav";
import { CommandPalette } from "./CommandPalette";

const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/discover", label: "Discover", icon: Compass },
  { to: "/dashboard/projects", label: "Projects", icon: Folders },
  { to: "/dashboard/experience", label: "Experience", icon: Briefcase },
  { to: "/dashboard/education", label: "Education", icon: GraduationCap },
  { to: "/dashboard/achievements", label: "Achievements", icon: Award },
  { to: "/dashboard/skills", label: "Skills", icon: Sparkles },
  { to: "/dashboard/timeline", label: "Timeline", icon: GitCommitVertical },
];

function NavItem({
  to,
  label,
  icon: Icon,
  exact,
  onClick,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  onClick?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "relative flex h-11 items-center gap-2.5 px-4 text-[13px] transition-colors duration-150 min-h-[44px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:ring-offset-1",
        isActive
          ? "bg-[var(--surface-2)] text-[var(--ink)] font-medium"
          : "text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      {isActive && (
        <span className="absolute left-0 top-0 h-full w-0.5 bg-[var(--ink)]" aria-hidden="true" />
      )}
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {label}
    </Link>
  );
}

function SidebarContent({
  profile,
  completion,
  lanes,
  activeLanes,
  initials,
  onNavClick,
  onSignOut,
}: {
  profile: ReturnType<typeof useAuth>["profile"];
  completion: number;
  lanes: { key: string; value: number }[];
  activeLanes: number;
  initials: string;
  onNavClick?: () => void;
  onSignOut: () => void;
}) {
  return (
    <>
      {/* Profile header */}
      <div className="border-b border-[var(--surface-3)] px-4 pb-5 pt-6">
        <div className="flex items-center gap-3">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.name}
              className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-white"
            />
          ) : (
            <Avatar initials={initials} size="md" />
          )}
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-[var(--ink)]">
              {profile?.name || "Your name"}
            </div>
            <div className="truncate text-[11px] text-[var(--ink-3)]">
              {profile?.school || "Add your school"}
            </div>
          </div>
        </div>
      </div>

      {/* Profile readiness */}
      <div className="px-4 pb-2 pt-4">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--ink-3)]">
            Profile readiness
          </div>
          <div className="text-[11px] text-[var(--ink-3)]">{completion}%</div>
        </div>
        <div
          className="h-[3px] overflow-hidden rounded-full bg-[var(--surface-3)]"
          role="progressbar"
          aria-valuenow={completion}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Profile ${completion}% complete`}
        >
          <div
            className="h-full rounded-full bg-[var(--ink)] transition-all duration-500"
            style={{ width: `${completion}%` }}
          />
        </div>
        <div className="mt-2 flex gap-1" aria-hidden="true">
          {lanes.map((l) => (
            <span
              key={l.key}
              title={l.key}
              className={cn(
                "h-[3px] flex-1 rounded-full",
                l.value > 0 ? "bg-[var(--ink)]" : "bg-[var(--surface-3)]",
              )}
            />
          ))}
        </div>
        <div className="mt-1 text-[11px] text-[var(--ink-3)]">
          {activeLanes} of 5 sections active
        </div>
      </div>

      {/* Profile nav */}
      <div className="mt-3 px-4 pb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--ink-3)]">
        Profile
      </div>
      <nav aria-label="Dashboard navigation">
        {nav.map((n) => (
          <NavItem key={n.to} {...n} onClick={onNavClick} />
        ))}
      </nav>

      <div className="mx-4 my-3 h-px bg-[var(--surface-3)]" />

      {/* Output nav */}
      <div className="px-4 pb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--ink-3)]">
        Output
      </div>
      <NavItem
        to="/dashboard/output"
        label="Export & Output"
        icon={Download}
        onClick={onNavClick}
      />

      {/* Bottom actions */}
      <div className="mt-auto border-t border-[var(--surface-3)] pt-2">
        <NavItem to="/settings" label="Settings" icon={SettingsIcon} onClick={onNavClick} />
        <button
          onClick={onSignOut}
          className="flex h-11 w-full items-center gap-2.5 px-4 text-[13px] text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:ring-offset-1 min-h-[44px]"
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          Log out
        </button>
      </div>
    </>
  );
}

function DashboardShellInner() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const counts = useProfileCounts(user?.id);
  const completion = useProfileCompletion(user?.id);
  const { isOpen, close, toggle } = useMobileNav();
  const overlayRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const createProject = useCreateProject();

  // Quick-create: used by both the command palette and the global "c"
  // shortcut (PRD §6.3 — memorable shortcut for New Project).
  const quickCreateProject = () => {
    if (!user) return;
    createProject.mutate(
      {
        user_id: user.id,
        title: "Untitled project",
        type: "Personal Project",
        date: String(new Date().getFullYear()),
        start_year: new Date().getFullYear(),
      },
      {
        onSuccess: (project) => {
          navigate({ to: "/dashboard/projects/$projectId", params: { projectId: project.id } });
        },
      },
    );
  };

  // Global "c" shortcut for New Project — ignored while typing in a field
  // or when a dialog/command palette is already open.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.closest('[role="dialog"]'));
      if (isTyping) return;
      if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        quickCreateProject();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const lanes = [
    { key: "projects", value: counts.projects },
    { key: "experience", value: counts.experience },
    { key: "education", value: counts.education },
    { key: "achievements", value: counts.achievements },
    { key: "skills", value: counts.skills },
  ];
  const activeLanes = lanes.filter((l) => l.value > 0).length;

  const handleSignOut = async () => {
    close();
    await signOut();
    navigate({ to: "/" });
  };

  const handleNavClick = () => {
    close();
  };

  // Return focus to menu button when drawer closes
  useEffect(() => {
    if (!isOpen) {
      menuButtonRef.current?.focus();
    }
  }, [isOpen]);

  const initials =
    profile?.initials ?? (profile?.name ? profile.name.slice(0, 2).toUpperCase() : "?");

  return (
    <div className="min-h-dvh bg-[var(--surface)]">
      {/* Desktop sidebar */}
      <aside
        className="fixed left-0 top-0 hidden h-dvh w-60 flex-col border-r border-[var(--surface-3)] bg-[var(--surface)] md:flex"
        aria-label="Sidebar"
      >
        <SidebarContent
          profile={profile}
          completion={completion}
          lanes={lanes}
          activeLanes={activeLanes}
          initials={initials}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* Mobile header bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--surface-3)] bg-[var(--surface)] px-4 md:hidden">
        <button
          ref={menuButtonRef}
          onClick={toggle}
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isOpen}
          aria-controls="mobile-nav-drawer"
          className="flex h-11 w-11 items-center justify-center rounded-md text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:ring-offset-1 transition-colors"
        >
          {isOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
        <span className="font-serif text-[18px] font-semibold tracking-[-0.02em] text-[var(--ink)]">
          Brio
        </span>
        {/* Right side: avatar for visual balance */}
        <div className="h-11 w-11 flex items-center justify-center">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.name}
              className="h-8 w-8 rounded-full object-cover ring-2 ring-white"
            />
          ) : (
            <Avatar initials={initials} size="sm" />
          )}
        </div>
      </header>

      {/* Mobile nav drawer overlay */}
      <div
        ref={overlayRef}
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          "fixed inset-0 z-50 md:hidden",
          isOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        {/* Backdrop */}
        <div
          className={cn(
            "absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-[250ms]",
            isOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={close}
          aria-hidden="true"
        />

        {/* Drawer panel */}
        <div
          className={cn(
            "absolute left-0 top-0 flex h-dvh w-72 max-w-[85vw] flex-col bg-[var(--surface)] shadow-xl",
            "transition-transform duration-[250ms] ease-out will-change-transform",
            isOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {/* Drawer close button in header area */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--surface-3)] px-4">
            <span className="font-serif text-[18px] font-semibold tracking-[-0.02em] text-[var(--ink)]">
              Brio
            </span>
            <button
              onClick={close}
              aria-label="Close navigation menu"
              className="flex h-11 w-11 items-center justify-center rounded-md text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:ring-offset-1 transition-colors"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Scrollable nav content */}
          <div className="flex flex-1 flex-col overflow-y-auto">
            <SidebarContent
              profile={profile}
              completion={completion}
              lanes={lanes}
              activeLanes={activeLanes}
              initials={initials}
              onNavClick={handleNavClick}
              onSignOut={handleSignOut}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="min-h-dvh md:ml-60">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:px-10 md:py-12">
          <Outlet />
        </div>
      </main>

      <CommandPalette onCreateProject={quickCreateProject} />
    </div>
  );
}

export function DashboardShell() {
  return (
    <AuthGuard>
      <DashboardShellInner />
    </AuthGuard>
  );
}
