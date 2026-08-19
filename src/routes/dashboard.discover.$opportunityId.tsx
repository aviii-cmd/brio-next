import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bookmark,
  CalendarPlus,
  CheckCircle2,
  Circle,
  MapPin,
  Wallet,
  Clock,
  GraduationCap,
  ExternalLink,
  Plus,
  X,
  ThumbsDown,
  FileText,
  Check,
} from "lucide-react";
import { Badge, Button, Card, EmptyState } from "@/components/brio/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { DeadlineBadge } from "@/components/brio/discover/DeadlineBadge";
import { useAuth } from "@/hooks/useAuth";
import {
  useOpportunity,
  useApplicationForOpportunity,
  useLogOpportunityView,
  useSavedOpportunities,
  useSaveOpportunity,
  useUnsaveOpportunity,
  useCreateApplication,
  useUpdateApplicationStatus,
  useUpdateApplicationNotes,
  useAddChecklistItem,
  useToggleChecklistItem,
  useDeleteChecklistItem,
  useSubmitOpportunityFeedback,
} from "@/hooks/useDiscover";
import { checklistService } from "@/services/discover";
import { useQuery } from "@tanstack/react-query";
import {
  formatDeadline,
  gradeRangeLabel,
  generateDeadlineICS,
  downloadICS,
  APPLICATION_STATUS_LABELS,
} from "@/lib/opportunityUtils";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/types/database";

export const Route = createFileRoute("/dashboard/discover/$opportunityId")({
  head: () => ({ meta: [{ title: "Opportunity — Discover — Brio" }] }),
  component: OpportunityDetailPage,
});

const PRESTIGE_VARIANT = {
  School: "level-school",
  Regional: "level-regional",
  National: "level-national",
  International: "level-international",
} as const;

function OpportunityDetailPage() {
  const { opportunityId } = Route.useParams();
  const { user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();

  const opportunityQuery = useOpportunity(opportunityId);
  const applicationQuery = useApplicationForOpportunity(userId, opportunityId);
  const logView = useLogOpportunityView();
  const saved = useSavedOpportunities(userId);
  const saveOpportunity = useSaveOpportunity();
  const unsaveOpportunity = useUnsaveOpportunity();
  const createApplication = useCreateApplication();
  const updateStatus = useUpdateApplicationStatus();
  const updateNotes = useUpdateApplicationNotes();
  const addChecklistItem = useAddChecklistItem();
  const toggleChecklistItem = useToggleChecklistItem();
  const deleteChecklistItem = useDeleteChecklistItem();
  const submitFeedback = useSubmitOpportunityFeedback();

  const application = applicationQuery.data;
  const checklistQuery = useQuery({
    queryKey: ["discover-checklist", application?.id ?? ""],
    queryFn: () => checklistService.listForApplications([application!.id]),
    enabled: !!application?.id,
  });

  const [notesEditing, setNotesEditing] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [newStepTitle, setNewStepTitle] = useState("");

  useEffect(() => {
    if (userId && opportunityId) logView.mutate({ userId, opportunityId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, opportunityId]);

  useEffect(() => {
    setNotesDraft(application?.notes ?? "");
  }, [application?.notes]);

  if (opportunityQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="brio-skeleton h-8 w-32 rounded" />
        <div className="brio-skeleton h-40 rounded-lg" />
        <div className="brio-skeleton h-64 rounded-lg" />
      </div>
    );
  }

  if (opportunityQuery.isError || !opportunityQuery.data) {
    return (
      <EmptyState
        icon={<Circle className="h-6 w-6" />}
        title="Opportunity not found"
        body="This listing may have been removed or is no longer active."
        cta={
          <Link to="/dashboard/discover">
            <Button variant="primary">Back to Discover</Button>
          </Link>
        }
      />
    );
  }

  const opportunity = opportunityQuery.data;
  const isSaved = saved.savedIds.has(opportunity.id);
  const checklist = checklistQuery.data ?? [];
  const isTracked = !!application;

  const handlePlan = (status: ApplicationStatus) => {
    if (!userId) return;
    createApplication.mutate({ userId, opportunityId: opportunity.id, status });
  };

  const handleAddStep = () => {
    if (!application || !newStepTitle.trim()) return;
    addChecklistItem.mutate({ applicationId: application.id, title: newStepTitle.trim() });
    setNewStepTitle("");
  };

  const ics = generateDeadlineICS(opportunity);

  return (
    <div className="mx-auto max-w-3xl">
      <button
        type="button"
        onClick={() => navigate({ to: "/dashboard/discover" })}
        className="mb-4 flex items-center gap-1 text-[13px] text-[var(--ink-2)] hover:text-[var(--ink)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Discover
      </button>

      {/* Hero */}
      <Card className="mb-5 bg-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] uppercase tracking-[0.04em] text-[var(--ink-3)]">
              {opportunity.category}
            </span>
            <Badge variant={PRESTIGE_VARIANT[opportunity.prestige_level]}>
              {opportunity.prestige_level}
            </Badge>
            <Badge>{opportunity.difficulty}</Badge>
          </div>
          <button
            type="button"
            onClick={() =>
              userId &&
              (isSaved
                ? unsaveOpportunity.mutate({ userId, opportunityId: opportunity.id })
                : saveOpportunity.mutate({ userId, opportunityId: opportunity.id }))
            }
            aria-pressed={isSaved}
            aria-label={isSaved ? "Remove from saved" : "Save opportunity"}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--surface-3)] bg-white px-3 py-1.5 text-[12px] text-[var(--ink-2)] hover:text-[var(--ink)]"
          >
            <Bookmark
              className={
                isSaved ? "h-3.5 w-3.5 fill-[var(--ink)] text-[var(--ink)]" : "h-3.5 w-3.5"
              }
            />
            {isSaved ? "Saved" : "Save"}
          </button>
        </div>

        <h1 className="mt-3 text-[24px] font-medium leading-[1.3] tracking-[-0.02em] text-[var(--ink)]">
          {opportunity.title}
        </h1>
        <p className="mt-1 text-[14px] text-[var(--ink-2)]">{opportunity.organization}</p>
        {opportunity.summary && (
          <p className="mt-2 text-[14px] text-[var(--ink-2)]">{opportunity.summary}</p>
        )}

        {/* Quick facts */}
        <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--surface-3)] pt-4 sm:grid-cols-4">
          <div>
            <dt className="text-[11px] uppercase tracking-[0.03em] text-[var(--ink-3)]">
              Deadline
            </dt>
            <dd className="mt-1">
              <DeadlineBadge opportunity={opportunity} />
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.03em] text-[var(--ink-3)]">
              Location
            </dt>
            <dd className="mt-1 flex items-center gap-1 text-[13px] text-[var(--ink)]">
              <MapPin className="h-3.5 w-3.5 text-[var(--ink-3)]" />
              {opportunity.location_type === "Remote"
                ? "Remote"
                : (opportunity.country ?? opportunity.location_type)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.03em] text-[var(--ink-3)]">
              Duration
            </dt>
            <dd className="mt-1 flex items-center gap-1 text-[13px] text-[var(--ink)]">
              <Clock className="h-3.5 w-3.5 text-[var(--ink-3)]" />
              {opportunity.duration || opportunity.time_commitment || "Varies"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.03em] text-[var(--ink-3)]">
              Grade range
            </dt>
            <dd className="mt-1 flex items-center gap-1 text-[13px] text-[var(--ink)]">
              <GraduationCap className="h-3.5 w-3.5 text-[var(--ink-3)]" />
              {gradeRangeLabel(
                opportunity.eligibility_grade_min,
                opportunity.eligibility_grade_max,
              )}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--surface-3)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--ink-2)]">
            <Wallet className="h-3 w-3" />
            {opportunity.cost_type}
          </span>
          {opportunity.career_track && (
            <span className="rounded-full border border-[var(--surface-3)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--ink-2)]">
              {opportunity.career_track} track
            </span>
          )}
        </div>

        {/* Primary CTAs */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--surface-3)] pt-4">
          {!isTracked ? (
            <>
              <Button
                variant="primary"
                onClick={() => handlePlan("planning")}
                disabled={createApplication.isPending}
              >
                Plan application
              </Button>
              <Button
                variant="secondary"
                onClick={() => handlePlan("applied")}
                disabled={createApplication.isPending}
              >
                Mark as applied
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-[var(--ink-2)]">Status</span>
              <select
                value={application.status}
                onChange={(e) =>
                  updateStatus.mutate({
                    id: application.id,
                    status: e.target.value as ApplicationStatus,
                    userId: userId!,
                  })
                }
                className="h-8 rounded-[4px] border border-[var(--surface-3)] bg-white px-2 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--ink)]"
              >
                {APPLICATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {APPLICATION_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          )}
          {opportunity.application_url && (
            <a href={opportunity.application_url} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost">
                Visit application page
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
          )}
          {ics && (
            <Button variant="ghost" onClick={() => downloadICS(`${opportunity.title}.ics`, ics)}>
              <CalendarPlus className="h-3.5 w-3.5" />
              Add deadline to calendar
            </Button>
          )}
          <button
            type="button"
            onClick={() =>
              userId &&
              submitFeedback.mutate({
                userId,
                opportunityId: opportunity.id,
                feedback: "not_relevant",
              })
            }
            className="ml-auto flex items-center gap-1 text-[12px] text-[var(--ink-3)] hover:text-[var(--ink-2)]"
          >
            <ThumbsDown className="h-3 w-3" />
            Not relevant to me
          </button>
        </div>
      </Card>

      {/* Why it matters */}
      {opportunity.why_it_matters && (
        <Card className="mb-5 bg-white">
          <h2 className="mb-2 text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-3)]">
            Why it matters
          </h2>
          <p className="text-[14px] leading-relaxed text-[var(--ink)]">
            {opportunity.why_it_matters}
          </p>
        </Card>
      )}

      {/* Structured eligibility */}
      {opportunity.eligibility_requirements.length > 0 && (
        <Card className="mb-5 bg-white">
          <h2 className="mb-3 text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-3)]">
            Eligibility
          </h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {opportunity.eligibility_requirements.map((req, i) => (
              <div key={i}>
                <dt className="text-[12px] text-[var(--ink-3)]">{req.label}</dt>
                <dd className="text-[14px] text-[var(--ink)]">{req.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      {/* Application steps / interactive checklist */}
      {(opportunity.application_steps.length > 0 || isTracked) && (
        <Card className="mb-5 bg-white">
          <h2 className="mb-3 text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-3)]">
            {isTracked ? "Your checklist" : "Application steps"}
          </h2>

          {isTracked ? (
            <div className="space-y-2">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-start gap-2.5">
                  <Checkbox
                    checked={item.is_complete}
                    onCheckedChange={(checked) =>
                      toggleChecklistItem.mutate({ id: item.id, isComplete: checked === true })
                    }
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={
                        item.is_complete
                          ? "text-[14px] text-[var(--ink-3)] line-through"
                          : "text-[14px] text-[var(--ink)]"
                      }
                    >
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-[12px] text-[var(--ink-3)]">{item.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteChecklistItem.mutate({ id: item.id })}
                    aria-label="Remove step"
                    className="shrink-0 text-[var(--ink-3)] hover:text-[var(--error)]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1">
                <input
                  value={newStepTitle}
                  onChange={(e) => setNewStepTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddStep()}
                  placeholder="Add a step (e.g., Get recommendation letter)"
                  className="h-8 flex-1 rounded-[4px] border border-[var(--surface-3)] bg-white px-2 text-[13px] outline-none focus:border-[var(--ink)]"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddStep}
                  disabled={!newStepTitle.trim()}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
            </div>
          ) : (
            <ol className="space-y-2">
              {opportunity.application_steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[14px] text-[var(--ink)]">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-[11px] text-[var(--ink-2)]">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium">{step.title}</p>
                    {step.description && (
                      <p className="text-[13px] text-[var(--ink-2)]">{step.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}

      {/* Notes (only once tracked) */}
      {isTracked && (
        <Card className="mb-5 bg-white">
          <div className="mb-2 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-[var(--ink-3)]" />
            <h2 className="text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-3)]">
              Your notes
            </h2>
          </div>
          {notesEditing ? (
            <div className="flex items-start gap-2">
              <textarea
                autoFocus
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-[4px] border border-[var(--surface-3)] bg-white p-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--ink)]"
              />
              <button
                type="button"
                onClick={() => {
                  updateNotes.mutate({ id: application.id, notes: notesDraft, userId: userId! });
                  setNotesEditing(false);
                }}
                aria-label="Save notes"
                className="shrink-0 rounded p-1.5 text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setNotesEditing(true)}
              className="w-full text-left text-[14px] text-[var(--ink-2)]"
            >
              {application.notes || (
                <span className="text-[var(--ink-3)]">Add notes about this application…</span>
              )}
            </button>
          )}
        </Card>
      )}

      {/* Preparation resources */}
      {opportunity.preparation_resources.length > 0 && (
        <Card className="mb-5 bg-white">
          <h2 className="mb-3 text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-3)]">
            Preparation resources
          </h2>
          <div className="flex flex-col gap-2">
            {opportunity.preparation_resources.map((res, i) => (
              <a
                key={i}
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 rounded-[4px] border border-[var(--surface-3)] px-3 py-2 text-[13px] text-[var(--ink)] hover:bg-[var(--surface-2)]"
              >
                {res.title}
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--ink-3)]" />
              </a>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
