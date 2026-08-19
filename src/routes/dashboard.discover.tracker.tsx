import { createFileRoute, Link } from "@tanstack/react-router";
import { KanbanSquare, BellRing } from "lucide-react";
import { PageHeader, EmptyState, Button } from "@/components/brio/ui";
import { DiscoverTabs } from "@/components/brio/discover/DiscoverTabs";
import { KanbanBoard } from "@/components/brio/discover/KanbanBoard";
import { useAuth } from "@/hooks/useAuth";
import { useApplicationsWithDetails } from "@/hooks/useDiscover";
import { computeDeadlineReminders, computeChecklistReminders } from "@/lib/opportunityUtils";

export const Route = createFileRoute("/dashboard/discover/tracker")({
  head: () => ({ meta: [{ title: "Application Tracker — Discover — Brio" }] }),
  component: TrackerPage,
});

function TrackerPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const tracker = useApplicationsWithDetails(userId);

  const deadlineReminders = computeDeadlineReminders(tracker.data);
  const allChecklistItems = tracker.data.flatMap((a) => a.checklist);
  const checklistReminders = computeChecklistReminders(allChecklistItems, tracker.data);
  const hasReminders = deadlineReminders.length > 0 || checklistReminders.length > 0;

  return (
    <>
      <PageHeader
        title="Discover"
        subtitle="Every opportunity you're actively pursuing, in one pipeline."
      />
      <DiscoverTabs />

      {hasReminders && (
        <div className="mb-6 rounded-lg border border-[var(--surface-3)] bg-[var(--surface-2)] p-4">
          <div className="mb-2 flex items-center gap-1.5">
            <BellRing className="h-3.5 w-3.5 text-[var(--accent-warm)]" />
            <h2 className="text-[13px] font-medium text-[var(--ink)]">Reminders</h2>
          </div>
          <ul className="space-y-1.5">
            {deadlineReminders.slice(0, 4).map((r) => (
              <li key={r.applicationId} className="text-[13px] text-[var(--ink-2)]">
                <Link
                  to="/dashboard/discover/$opportunityId"
                  params={{ opportunityId: r.opportunityId }}
                  className="font-medium text-[var(--ink)] hover:underline"
                >
                  {r.title}
                </Link>{" "}
                closes in {r.daysLeft} {r.daysLeft === 1 ? "day" : "days"} — you haven't applied
                yet.
              </li>
            ))}
            {checklistReminders.slice(0, 4).map((r) => (
              <li key={r.itemId} className="text-[13px] text-[var(--ink-2)]">
                <span className="font-medium text-[var(--ink)]">{r.title}</span> for{" "}
                {r.opportunityTitle} is due in {r.daysLeft} {r.daysLeft === 1 ? "day" : "days"}.
              </li>
            ))}
          </ul>
        </div>
      )}

      {tracker.isLoading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="brio-skeleton h-[320px] w-[280px] shrink-0 rounded-lg" />
          ))}
        </div>
      ) : tracker.data.length === 0 ? (
        <EmptyState
          icon={<KanbanSquare className="h-6 w-6" />}
          title="Your tracker is empty"
          body="Save an opportunity from Discover, then mark it as 'Planning' to start tracking your application here."
          cta={
            <Link to="/dashboard/discover">
              <Button variant="primary">Explore opportunities</Button>
            </Link>
          }
        />
      ) : (
        <KanbanBoard applications={tracker.data} userId={userId!} />
      )}
    </>
  );
}
