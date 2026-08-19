import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { PageHeader, Button, Toggle, EmptyState } from "@/components/brio/ui";
import { DiscoverTabs } from "@/components/brio/discover/DiscoverTabs";
import { OpportunityCard } from "@/components/brio/discover/OpportunityCard";
import { FilterPanel } from "@/components/brio/discover/FilterPanel";
import { useAuth } from "@/hooks/useAuth";
import {
  useOpportunitySearch,
  useSavedOpportunities,
  useSaveOpportunity,
  useUnsaveOpportunity,
} from "@/hooks/useDiscover";
import { isGradeEligible } from "@/lib/opportunityUtils";
import type { Opportunity, OpportunityCategory } from "@/types/database";
import type { OpportunityFilters } from "@/services/discover";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/discover/search")({
  head: () => ({ meta: [{ title: "Search — Discover — Brio" }] }),
  component: SearchPage,
});

const QUICK_CATEGORIES: OpportunityCategory[] = [
  "Competition",
  "Internship",
  "Fellowship",
  "Scholarship",
  "Research Program",
  "Hackathon",
];

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function SearchPage() {
  const { user, profile } = useAuth();
  const userId = user?.id;

  const [queryInput, setQueryInput] = useState("");
  const query = useDebouncedValue(queryInput, 350);
  const [filters, setFilters] = useState<OpportunityFilters>({});
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [eligibleOnly, setEligibleOnly] = useState(false);

  const effectiveFilters = useMemo<OpportunityFilters>(
    () => ({ ...filters, query: query.trim() || undefined }),
    [filters, query],
  );

  const searchQuery = useOpportunitySearch(effectiveFilters);
  const saved = useSavedOpportunities(userId);
  const saveOpportunity = useSaveOpportunity();
  const unsaveOpportunity = useUnsaveOpportunity();

  const toggleSave = (opportunity: Opportunity) => {
    if (!userId) return;
    if (saved.savedIds.has(opportunity.id)) {
      unsaveOpportunity.mutate({ userId, opportunityId: opportunity.id });
    } else {
      saveOpportunity.mutate({ userId, opportunityId: opportunity.id });
    }
  };

  const allItems = useMemo(
    () => (searchQuery.data?.pages ?? []).flatMap((p) => p.items),
    [searchQuery.data],
  );
  const total = searchQuery.data?.pages?.[0]?.total ?? null;

  const studentRank = profile?.academic_level_rank ?? null;
  const visibleItems = eligibleOnly
    ? allItems.filter((o) => isGradeEligible(o, studentRank) !== false)
    : allItems;

  const activeFacetCount =
    (filters.categories?.length ?? 0) +
    (filters.locationTypes?.length ?? 0) +
    (filters.countries?.length ?? 0) +
    (filters.costTypes?.length ?? 0) +
    (filters.difficulties?.length ?? 0) +
    (filters.careerTracks?.length ?? 0) +
    (filters.prestigeLevels?.length ?? 0) +
    (filters.maxDeadlineDays != null ? 1 : 0);

  const toggleCategory = (cat: OpportunityCategory) => {
    setFilters((f) => {
      const current = f.categories ?? [];
      const next = current.includes(cat) ? current.filter((c) => c !== cat) : [...current, cat];
      return { ...f, categories: next.length ? next : undefined };
    });
  };

  const clearFilters = () => setFilters({});

  return (
    <>
      <PageHeader
        title="Discover"
        subtitle="Search the full opportunity catalog and filter to what fits."
      />
      <DiscoverTabs />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-3)]" />
          <input
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder='Try "summer AI research" or "climate scholarship"'
            className="h-10 w-full rounded-[6px] border border-[var(--surface-3)] bg-white pl-9 pr-9 text-[14px] text-[var(--ink)] outline-none transition-all duration-150 focus:border-[var(--ink)] focus:ring-2 focus:ring-[rgba(10,10,10,0.08)]"
          />
          {queryInput && (
            <button
              type="button"
              onClick={() => setQueryInput("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)] hover:text-[var(--ink)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button variant="secondary" onClick={() => setFilterPanelOpen(true)} className="shrink-0">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFacetCount > 0 && (
            <span className="ml-0.5 rounded-full bg-[var(--ink)] px-1.5 text-[11px] text-white">
              {activeFacetCount}
            </span>
          )}
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {QUICK_CATEGORIES.map((cat) => {
          const active = (filters.categories ?? []).includes(cat);
          return (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[12px] transition-colors",
                active
                  ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                  : "border-[var(--surface-3)] bg-white text-[var(--ink-2)] hover:bg-[var(--surface-2)]",
              )}
            >
              {cat}
            </button>
          );
        })}
      </div>

      <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-[var(--surface-3)] bg-[var(--surface-2)] px-4 py-2.5">
        <div>
          <p className="text-[13px] font-medium text-[var(--ink)]">
            Only show what I'm eligible for
          </p>
          {studentRank == null && (
            <p className="text-[12px] text-[var(--ink-3)]">
              Set your current grade/year in Settings to use this.
            </p>
          )}
        </div>
        <Toggle checked={eligibleOnly} onChange={setEligibleOnly} disabled={studentRank == null} />
      </div>

      {total != null && !searchQuery.isLoading && (
        <p className="mb-3 text-[12px] text-[var(--ink-3)]">
          {total} {total === 1 ? "result" : "results"}
          {eligibleOnly && visibleItems.length !== allItems.length
            ? ` — ${visibleItems.length} shown as eligible`
            : ""}
        </p>
      )}

      {searchQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="brio-skeleton h-[190px] rounded-lg" />
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title="No results"
          body="Try a broader search term, or relax a filter — eligibility and location filters narrow things the most."
          cta={
            activeFacetCount > 0 || eligibleOnly ? (
              <Button
                variant="secondary"
                onClick={() => {
                  clearFilters();
                  setEligibleOnly(false);
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleItems.map((o) => (
              <OpportunityCard
                key={o.id}
                opportunity={o}
                isSaved={saved.savedIds.has(o.id)}
                onToggleSave={() => toggleSave(o)}
                trending={o.saves_count >= 3}
              />
            ))}
          </div>
          {searchQuery.hasNextPage && (
            <div className="mt-5 flex justify-center">
              <Button
                variant="secondary"
                onClick={() => searchQuery.fetchNextPage()}
                disabled={searchQuery.isFetchingNextPage}
              >
                {searchQuery.isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}

      <FilterPanel
        open={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        filters={filters}
        onChange={setFilters}
        onClear={clearFilters}
        resultCount={total ?? undefined}
      />
    </>
  );
}
