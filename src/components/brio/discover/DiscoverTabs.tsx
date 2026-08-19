import { Link, useRouterState } from "@tanstack/react-router";
import { Compass, Search, Bookmark, KanbanSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/dashboard/discover", label: "Explore", icon: Compass, exact: true },
  { to: "/dashboard/discover/search", label: "Search", icon: Search, exact: false },
  { to: "/dashboard/discover/saved", label: "Saved", icon: Bookmark, exact: false },
  {
    to: "/dashboard/discover/tracker",
    label: "Application Tracker",
    icon: KanbanSquare,
    exact: false,
  },
] as const;

export function DiscoverTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="mb-6 -mt-2 flex items-center gap-1 overflow-x-auto scrollbar-hide border-b border-[var(--surface-3)]">
      {TABS.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.to
          : pathname === tab.to || pathname.startsWith(tab.to + "/");
        const Icon = tab.icon;
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-[13px] transition-colors duration-150 whitespace-nowrap",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:ring-offset-1 rounded-t-[4px]",
              isActive
                ? "text-[var(--ink)] font-medium"
                : "text-[var(--ink-2)] hover:text-[var(--ink)]",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {tab.label}
            {isActive && (
              <span
                className="absolute bottom-[-1px] left-0 h-0.5 w-full bg-[var(--ink)]"
                aria-hidden="true"
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
