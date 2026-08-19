import { Link } from "@tanstack/react-router";
import { Bookmark, MapPin, Wallet, Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "@/components/brio/ui";
import { DeadlineBadge } from "./DeadlineBadge";
import { cn } from "@/lib/utils";
import type { Opportunity } from "@/types/database";

const PRESTIGE_VARIANT = {
  School: "level-school",
  Regional: "level-regional",
  National: "level-national",
  International: "level-international",
} as const;

export function OpportunityCard({
  opportunity,
  explain,
  isSaved,
  onToggleSave,
  saveDisabled,
  trending,
  fixedWidth,
  className,
}: {
  opportunity: Opportunity;
  explain?: string;
  isSaved?: boolean;
  onToggleSave?: () => void;
  saveDisabled?: boolean;
  trending?: boolean;
  fixedWidth?: boolean;
  className?: string;
}) {
  return (
    <Link
      to="/dashboard/discover/$opportunityId"
      params={{ opportunityId: opportunity.id }}
      className={cn(
        "group relative flex flex-col rounded-lg border border-[var(--surface-3)] bg-[var(--surface-2)] p-4 text-left transition-all duration-200 hover:bg-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
        fixedWidth ? "w-[260px] shrink-0" : "w-full",
        className,
      )}
    >
      {onToggleSave && (
        <button
          type="button"
          disabled={saveDisabled}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSave();
          }}
          aria-label={isSaved ? "Remove from saved" : "Save opportunity"}
          aria-pressed={isSaved}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[var(--ink-2)] shadow-sm transition-colors hover:text-[var(--ink)] disabled:opacity-40"
        >
          <Bookmark
            className={cn("h-3.5 w-3.5", isSaved && "fill-[var(--ink)] text-[var(--ink)]")}
          />
        </button>
      )}

      <div className="flex items-center gap-2 pr-8">
        <span className="text-[11px] uppercase tracking-[0.04em] text-[var(--ink-3)]">
          {opportunity.category}
        </span>
        <Badge variant={PRESTIGE_VARIANT[opportunity.prestige_level]}>
          {opportunity.prestige_level}
        </Badge>
      </div>

      <h3 className="mt-2 line-clamp-2 text-[15px] font-medium leading-snug text-[var(--ink)]">
        {opportunity.title}
      </h3>
      <p className="mt-0.5 line-clamp-1 text-[13px] text-[var(--ink-2)]">
        {opportunity.organization}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <DeadlineBadge opportunity={opportunity} />
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--surface-3)] bg-white px-2 py-0.5 text-[11px] text-[var(--ink-2)]">
          <MapPin className="h-3 w-3" aria-hidden="true" />
          {opportunity.location_type === "Remote"
            ? "Remote"
            : (opportunity.country ?? opportunity.location_type)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--surface-3)] bg-white px-2 py-0.5 text-[11px] text-[var(--ink-2)]">
          <Wallet className="h-3 w-3" aria-hidden="true" />
          {opportunity.cost_type}
        </span>
      </div>

      {(explain || trending) && (
        <div className="mt-3 flex items-start gap-1.5 border-t border-[var(--surface-3)] pt-2.5 text-[12px] text-[var(--ink-2)]">
          {explain ? (
            <>
              <Sparkles
                className="mt-0.5 h-3 w-3 shrink-0 text-[var(--accent-warm)]"
                aria-hidden="true"
              />
              <span className="line-clamp-2">{explain}</span>
            </>
          ) : (
            <>
              <TrendingUp
                className="mt-0.5 h-3 w-3 shrink-0 text-[var(--accent-warm)]"
                aria-hidden="true"
              />
              <span>Trending with peers</span>
            </>
          )}
        </div>
      )}
    </Link>
  );
}
