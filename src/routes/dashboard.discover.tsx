import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  Clock3,
  History,
  Bookmark,
  KanbanSquare,
  ArrowRight,
  GraduationCap,
  MapPin,
} from "lucide-react";
import { PageHeader, Card, Button } from "@/components/brio/ui";
import { DiscoverTabs } from "@/components/brio/discover/DiscoverTabs";
import { OpportunityRail } from "@/components/brio/discover/OpportunityRail";
import { OpportunityCard } from "@/components/brio/discover/OpportunityCard";
import { useAuth } from "@/hooks/useAuth";
import {
  useRecommendations,
  useClosingSoon,
  useContinueExploring,
  useSavedOpportunities,
  useCollections,
  useApplicationsWithDetails,
  useSaveOpportunity,
  useUnsaveOpportunity,
} from "@/hooks/useDiscover";
import {
  explainRecommendation,
  getProfileGapPrompts,
  TRACKER_COLUMNS,
} from "@/lib/opportunityUtils";
import type { Opportunity } from "@/types/database";

export const Route = createFileRoute("/dashboard/discover")({
  head: () => ({ meta: [{ title: "Discover — Brio" }] }),
  component: DiscoverHome,
});

function DiscoverHome() {
  const { user, profile } = useAuth();
  const userId = user?.id;

  const recommendations = useRecommendations(userId, 14);
  const closingSoon = useClosingSoon(14, 10);
  const continueExploring = useContinueExploring(userId, 10);
  const saved = useSavedOpportunities(userId);
  const collections = useCollections();
  const tracker = useApplicationsWithDetails(userId);
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

  const gapPrompts = profile ? getProfileGapPrompts(profile) : [];
  const hasAnyApplications = tracker.data.length > 0;
  const snapshotCounts = TRACKER_COLUMNS.map((col) => ({
    ...col,
    count: tracker.data.filter((a) => col.statuses.includes(a.status)).length,
  }));

  return (
    <>
      <PageHeader
        title="Discover"
        subtitle="Opportunities matched to your profile — competitions, internships, fellowships, and more."
      />
      <DiscoverTabs />

      {gapPrompts.length > 0 && (
        <Card className="mb-6 flex flex-col gap-3 border-dashed sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <GraduationCap
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-warm)]"
              aria-hidden="true"
            />
            <div>
              <p className="text-[13px] font-medium text-[var(--ink)]">Sharpen your matches</p>
              <p className="text-[13px] text-[var(--ink-2)]">{gapPrompts.join(" ")}</p>
            </div>
          </div>
          <Link to="/settings" className="shrink-0">
            <Button variant="secondary" size="sm">
              Update profile
            </Button>
          </Link>
        </Card>
      )}

      <OpportunityRail
        title="Priority for you"
        subtitle="Matched to your skills, interests, and achievements"
        icon={<Sparkles className="h-4 w-4 text-[var(--accent-warm)]" />}
        isLoading={recommendations.isLoading}
        isEmpty={!recommendations.isLoading && recommendations.data?.length === 0}
        emptyMessage="Add a few skills or projects to your profile and we'll start surfacing high-fit opportunities here."
      >
        {recommendations.data?.map((rec) => (
          <OpportunityCard
            key={rec.id}
            opportunity={rec}
            explain={explainRecommendation(rec)}
            isSaved={saved.savedIds.has(rec.id)}
            onToggleSave={() => toggleSave(rec)}
            fixedWidth
          />
        ))}
      </OpportunityRail>

      <OpportunityRail
        title="Closing soon"
        subtitle="Deadlines in the next two weeks"
        icon={<Clock3 className="h-4 w-4 text-[var(--error)]" />}
        seeAllTo="/dashboard/discover/search"
        isLoading={closingSoon.isLoading}
        isEmpty={!closingSoon.isLoading && (closingSoon.data?.length ?? 0) === 0}
        emptyMessage="Nothing closing in the next two weeks — you're all caught up."
      >
        {closingSoon.data?.map((o) => (
          <OpportunityCard
            key={o.id}
            opportunity={o}
            isSaved={saved.savedIds.has(o.id)}
            onToggleSave={() => toggleSave(o)}
            fixedWidth
          />
        ))}
      </OpportunityRail>

      <OpportunityRail
        title="Continue exploring"
        subtitle="Opportunities you've viewed but haven't saved or tracked"
        icon={<History className="h-4 w-4 text-[var(--ink-2)]" />}
        isLoading={continueExploring.isLoading}
        isEmpty={!continueExploring.isLoading && continueExploring.data.length === 0}
        emptyMessage=""
      >
        {continueExploring.data.map((o) => (
          <OpportunityCard
            key={o.id}
            opportunity={o}
            isSaved={saved.savedIds.has(o.id)}
            onToggleSave={() => toggleSave(o)}
            fixedWidth
          />
        ))}
      </OpportunityRail>

      <OpportunityRail
        title="Saved opportunities"
        subtitle="Your personal backlog"
        icon={<Bookmark className="h-4 w-4 text-[var(--ink-2)]" />}
        seeAllTo="/dashboard/discover/saved"
        isLoading={saved.isLoading}
        isEmpty={!saved.isLoading && saved.data.length === 0}
        emptyMessage="Nothing saved yet — tap the bookmark icon on any opportunity to keep it here."
      >
        {saved.data.slice(0, 10).map((s) => (
          <OpportunityCard
            key={s.id}
            opportunity={s.opportunity}
            isSaved
            onToggleSave={() => toggleSave(s.opportunity)}
            fixedWidth
          />
        ))}
      </OpportunityRail>

      {(collections.data ?? []).map((collection) => (
        <OpportunityRail
          key={collection.id}
          title={collection.title}
          subtitle={collection.description}
          icon={<MapPin className="h-4 w-4 text-[var(--ink-2)]" />}
          isEmpty={collection.opportunities.length === 0}
          emptyMessage=""
        >
          {collection.opportunities.map((o) => (
            <OpportunityCard
              key={o.id}
              opportunity={o}
              isSaved={saved.savedIds.has(o.id)}
              onToggleSave={() => toggleSave(o)}
              fixedWidth
            />
          ))}
        </OpportunityRail>
      ))}

      <section className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KanbanSquare className="h-4 w-4 text-[var(--ink-2)]" />
            <h2 className="text-[15px] font-medium text-[var(--ink)]">Applications snapshot</h2>
          </div>
          <Link
            to="/dashboard/discover/tracker"
            className="flex items-center gap-0.5 text-[12px] font-medium text-[var(--ink-2)] hover:text-[var(--ink)]"
          >
            Open tracker
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        {hasAnyApplications ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {snapshotCounts.map((col) => (
              <Link
                key={col.key}
                to="/dashboard/discover/tracker"
                className="rounded-lg border border-[var(--surface-3)] bg-[var(--surface-2)] px-3 py-3 text-center transition-colors hover:bg-white"
              >
                <div className="text-[22px] font-medium text-[var(--ink)]">{col.count}</div>
                <div className="mt-0.5 text-[11px] text-[var(--ink-3)]">{col.label}</div>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="border-dashed text-center">
            <p className="text-[13px] text-[var(--ink-2)]">
              Nothing tracked yet. Save an opportunity and mark it as planned to start your
              pipeline.
            </p>
          </Card>
        )}
      </section>
    </>
  );
}
