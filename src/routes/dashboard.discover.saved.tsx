import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark, Pencil, Check } from "lucide-react";
import { PageHeader, EmptyState, Button } from "@/components/brio/ui";
import { DiscoverTabs } from "@/components/brio/discover/DiscoverTabs";
import { OpportunityCard } from "@/components/brio/discover/OpportunityCard";
import { useAuth } from "@/hooks/useAuth";
import {
  useSavedOpportunities,
  useUnsaveOpportunity,
  useSaveOpportunity,
} from "@/hooks/useDiscover";
import type { SavedOpportunityWithDetails } from "@/types/database";

export const Route = createFileRoute("/dashboard/discover/saved")({
  head: () => ({ meta: [{ title: "Saved — Discover — Brio" }] }),
  component: SavedPage,
});

function SavedPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const saved = useSavedOpportunities(userId);
  const unsaveOpportunity = useUnsaveOpportunity();
  const saveOpportunity = useSaveOpportunity();

  return (
    <>
      <PageHeader
        title="Discover"
        subtitle="Your personal backlog of opportunities to come back to."
      />
      <DiscoverTabs />

      {saved.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="brio-skeleton h-[150px] rounded-lg" />
          ))}
        </div>
      ) : saved.data.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="h-6 w-6" />}
          title="Nothing saved yet"
          body="Save opportunities you're not ready to act on yet — they'll all show up here so nothing slips through the cracks."
          cta={
            <Link to="/dashboard/discover">
              <Button variant="primary">Explore opportunities</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {saved.data.map((s) => (
            <SavedRow
              key={s.id}
              saved={s}
              userId={userId!}
              onUnsave={() =>
                unsaveOpportunity.mutate({ userId: userId!, opportunityId: s.opportunity_id })
              }
              onSaveNote={(note) =>
                saveOpportunity.mutate({ userId: userId!, opportunityId: s.opportunity_id, note })
              }
            />
          ))}
        </div>
      )}
    </>
  );
}

function SavedRow({
  saved,
  onUnsave,
  onSaveNote,
}: {
  saved: SavedOpportunityWithDetails;
  userId: string;
  onUnsave: () => void;
  onSaveNote: (note: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(saved.note);

  return (
    <div className="flex flex-col gap-2">
      <OpportunityCard opportunity={saved.opportunity} isSaved onToggleSave={onUnsave} />
      <div className="rounded-lg border border-dashed border-[var(--surface-3)] px-3 py-2">
        {editing ? (
          <div className="flex items-start gap-2">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a personal note — why you saved this, next steps, anything…"
              rows={2}
              className="w-full resize-none rounded-[4px] border border-[var(--surface-3)] bg-white p-2 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--ink)]"
            />
            <button
              type="button"
              onClick={() => {
                onSaveNote(draft);
                setEditing(false);
              }}
              aria-label="Save note"
              className="shrink-0 rounded p-1.5 text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex w-full items-start gap-2 text-left text-[13px] text-[var(--ink-2)]"
          >
            <Pencil className="mt-0.5 h-3 w-3 shrink-0 text-[var(--ink-3)]" />
            {saved.note ? (
              saved.note
            ) : (
              <span className="text-[var(--ink-3)]">Add a personal note…</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
