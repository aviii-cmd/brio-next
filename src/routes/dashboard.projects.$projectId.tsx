import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Star,
  MoreHorizontal,
  Camera,
  Copy,
  Globe,
  Archive,
  RotateCcw,
  Trash2,
  ImageIcon,
  ExternalLink,
  X,
} from "lucide-react";
import { Button } from "@/components/brio/ui";
import {
  StatusBadge,
  AutosaveIndicator,
  InlineText,
  InlineTextarea,
  ReadinessBar,
  SectionLabel,
} from "@/components/brio/ProjectsUI";
import { MilestoneTimeline } from "@/components/brio/MilestoneTimeline";
import { ArtifactGallery } from "@/components/brio/ArtifactGallery";
import { SkillsAndTechnologies, TypedTagPicker } from "@/components/brio/SkillsAndTags";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useDeleteProject } from "@/hooks/useData";
import {
  useProject,
  useProjectAutosave,
  useSetProjectStatus,
  useProjectReadiness,
  useUploadCoverImage,
  useRemoveCoverImage,
} from "@/hooks/useProjectWorkspace";
import { PROJECT_TYPES } from "@/lib/schemas";
import type { Project } from "@/types/database";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/projects/$projectId")({
  head: () => ({ meta: [{ title: "Project — Brio" }] }),
  component: ProjectDetailPage,
});

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "process", label: "Process" },
  { id: "artifacts", label: "Artifacts" },
  { id: "results", label: "Results" },
  { id: "reflection", label: "Reflection" },
] as const;

// Soft hints — coaching copy shown as placeholders, tuned per template
// (PRD §5.1 templates, §8 "soft hints" for incomplete narratives).
const HINTS: Record<string, Record<string, string>> = {
  hackathon: {
    problem: "What challenge did the hackathon prompt pose, and what constraints (48 hours? a specific API?) shaped your approach?",
    action: "Walk through how the team divided work, what you personally built, and the key technical decisions.",
    result: "What did you ship by demo time? Did you place, get feedback from judges, or keep building after?",
  },
  internship: {
    problem: "What business or technical problem was your team trying to solve when you joined?",
    action: "What was your day-to-day? Which parts of the system or process did you own?",
    result: "What shipped because of your work? Cite metrics or manager/mentor feedback if you have them.",
  },
  default: {
    problem: "What problem were you solving, and what constraints (time, resources, skills) did you face?",
    constraints: "Any specific limitations — budget, timeline, tech stack — worth calling out?",
    action: "Walk through your approach step by step. What did you try, and why?",
    result: "What was the measurable or qualitative outcome? Numbers, feedback, adoption?",
    reflection: "What would you do differently? What did this teach you?",
    summary: "In 2-3 sentences: what is this project, and what was the outcome?",
  },
};

function hint(template: string | null | undefined, field: string): string {
  return HINTS[template ?? "default"]?.[field] ?? HINTS.default[field] ?? "";
}

function ProjectDetailPage() {
  const { projectId } = Route.useParams();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const navigate = useNavigate();

  const { data: project, isLoading, isError } = useProject(projectId);
  const readiness = useProjectReadiness(projectId);
  const { save, flushNow, status: autosaveStatus } = useProjectAutosave(projectId, userId);
  const setStatus = useSetProjectStatus();
  const deleteProject = useDeleteProject();
  const uploadCover = useUploadCoverImage();
  const removeCover = useRemoveCoverImage();

  const [draft, setDraft] = useState<Project | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Seed local draft once per project — subsequent server refetches (from
  // our own autosave round-trips, etc.) must NOT clobber in-progress typing.
  useEffect(() => {
    if (project && draft?.id !== project.id) setDraft(project);
  }, [project, draft?.id]);

  // A signed-in user can open any *published* project's edit URL (e.g. a
  // stale bookmark) even if they don't own it — RLS still blocks writes,
  // but redirect to the read-only public view rather than show broken
  // "editable" controls.
  useEffect(() => {
    if (project && userId && project.user_id !== userId) {
      navigate({ to: "/p/$projectId", params: { projectId }, replace: true });
    }
  }, [project, userId, projectId, navigate]);

  // Cmd/Ctrl+S — "Save Section Focus" shortcut (PRD §6.3): flush pending
  // autosave immediately and blur the field, even though autosave already
  // happens silently in the background.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        flushNow();
        (document.activeElement as HTMLElement | null)?.blur();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [flushNow]);

  const patch = (updates: Partial<Project>) => {
    setDraft((d) => (d ? { ...d, ...updates } : d));
    // Title is the one field we never persist empty — losing it breaks the
    // project card and share link. Local state still reflects what's typed;
    // we simply hold off saving until there's something to save.
    if ("title" in updates && !updates.title?.trim()) return;
    save(updates as Record<string, unknown>);
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/p/${projectId}` : "";

  if (isLoading || !draft) return <DetailSkeleton />;
  if (isError || !project) return <NotFoundState />;

  return (
    <div className="pb-24">
      <Link
        to="/dashboard/projects"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-[var(--ink-3)] hover:text-[var(--ink)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All projects
      </Link>

      {/* ============ HERO ============ */}
      <div className="mb-6 overflow-hidden rounded-lg border border-[var(--surface-3)] bg-white">
        <div className="group relative aspect-[21/9] w-full bg-[var(--surface-2)] sm:aspect-[3/1]">
          {draft.cover_image_url ? (
            <img src={draft.cover_image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="h-6 w-6 text-[var(--ink-3)]" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all duration-150 group-hover:bg-black/30 group-hover:opacity-100">
            <Button variant="secondary" size="sm" onClick={() => coverInputRef.current?.click()} loading={uploadCover.isPending}>
              <Camera className="h-3.5 w-3.5" /> {draft.cover_image_url ? "Change cover" : "Add cover image"}
            </Button>
            {draft.cover_image_url && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  removeCover.mutate({ projectId, userId });
                  setDraft((d) => (d ? { ...d, cover_image_url: null } : d));
                }}
              >
                <X className="h-3.5 w-3.5" /> Remove
              </Button>
            )}
          </div>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                uploadCover.mutate(
                  { userId, projectId, file },
                  { onSuccess: (url) => setDraft((d) => (d ? { ...d, cover_image_url: url } : d)) },
                );
              }
              e.target.value = "";
            }}
          />
        </div>

        <div className="p-5 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={draft.status} />
            <select
              value={draft.type}
              onChange={(e) => patch({ type: e.target.value })}
              className="h-6 rounded-full border border-[var(--surface-3)] bg-transparent px-2 text-[11px] text-[var(--ink-2)] outline-none focus:border-[var(--ink)]"
            >
              {PROJECT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => patch({ featured: !draft.featured })}
              aria-pressed={draft.featured}
              aria-label="Toggle featured"
              className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--ink-3)] hover:bg-[var(--surface-2)]"
            >
              <Star className={cn("h-3.5 w-3.5", draft.featured && "fill-[var(--accent-warm)] text-[var(--accent-warm)]")} />
            </button>
            <div className="ml-auto flex items-center gap-2">
              <AutosaveIndicator status={autosaveStatus} />
              <ProjectMenu
                project={draft}
                shareUrl={shareUrl}
                onPublish={() => setPublishOpen(true)}
                onRevertToDraft={() => setStatus.mutate({ id: projectId, status: "draft", userId })}
                onArchive={() => setStatus.mutate({ id: projectId, status: "archived", userId })}
                onDelete={() => setDeleteOpen(true)}
              />
            </div>
          </div>

          <InlineText
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="Untitled project"
            className="!text-[26px] font-medium leading-tight tracking-[-0.02em] text-[var(--ink)]"
            aria-label="Project title"
          />

          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <InlineText
              value={draft.role}
              onChange={(e) => patch({ role: e.target.value })}
              placeholder="Your role (e.g. Team lead)"
              className="text-[14px] text-[var(--ink-2)]"
            />
            <InlineText
              value={draft.date}
              onChange={(e) => patch({ date: e.target.value })}
              placeholder="Date (e.g. Spring 2026)"
              className="text-[14px] text-[var(--ink-2)]"
            />
            <div className="flex items-center gap-1">
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--ink-3)]" />
              <InlineText
                value={draft.url ?? ""}
                onChange={(e) => patch({ url: e.target.value })}
                placeholder="Live link (optional)"
                className="text-[14px] text-[var(--ink-2)]"
              />
            </div>
          </div>

          <div className="mt-4">
            <ReadinessBar
              score={readiness?.score ?? 0}
              stageLabel={readiness?.stageLabel ?? "Draft"}
              missing={readiness?.missing ?? []}
            />
          </div>
        </div>
      </div>

      {/* ============ STICKY SUB-NAV ============ */}
      <nav
        aria-label="Project sections"
        className="sticky top-0 z-10 mb-8 flex gap-1 overflow-x-auto rounded-lg border border-[var(--surface-3)] bg-[var(--surface)]/95 px-1.5 py-1.5 backdrop-blur"
      >
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => scrollToSection(s.id)}
            className="shrink-0 rounded-md px-3 py-1.5 text-[13px] font-medium text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
          >
            {s.label}
          </button>
        ))}
      </nav>

      <div className="space-y-12">
        {/* ============ OVERVIEW ============ */}
        <section id="overview" aria-labelledby="overview-heading">
          <SectionLabel id="overview-heading">Summary</SectionLabel>
          <InlineTextarea
            value={draft.summary}
            onChange={(e) => patch({ summary: e.target.value })}
            placeholder={hint(draft.template, "summary")}
            rows={2}
          />
          <p className="mt-1 text-right text-[11px] text-[var(--ink-3)]">{draft.summary.length}/500</p>

          <div className="mt-6">
            <SectionLabel>Problem &amp; Objectives</SectionLabel>
            <InlineTextarea
              value={draft.problem}
              onChange={(e) => patch({ problem: e.target.value })}
              placeholder={hint(draft.template, "problem")}
              rows={4}
            />
          </div>

          <div className="mt-6">
            <SectionLabel>Constraints</SectionLabel>
            <InlineTextarea
              value={draft.constraints}
              onChange={(e) => patch({ constraints: e.target.value })}
              placeholder={hint(draft.template, "constraints")}
              rows={2}
            />
          </div>
        </section>

        {/* ============ PROCESS ============ */}
        <section id="process" aria-labelledby="process-heading">
          <SectionLabel id="process-heading">Solution &amp; Process</SectionLabel>
          <InlineTextarea
            value={draft.action}
            onChange={(e) => patch({ action: e.target.value })}
            placeholder={hint(draft.template, "action")}
            rows={5}
          />
          <div className="mt-6">
            <SectionLabel>Timeline &amp; Milestones</SectionLabel>
            <MilestoneTimeline projectId={projectId} />
          </div>
        </section>

        {/* ============ ARTIFACTS ============ */}
        <section id="artifacts" aria-labelledby="artifacts-heading">
          <SectionLabel id="artifacts-heading">Artifact Gallery</SectionLabel>
          <ArtifactGallery projectId={projectId} userId={userId} />
        </section>

        {/* ============ RESULTS ============ */}
        <section id="results" aria-labelledby="results-heading">
          <SectionLabel id="results-heading">Results &amp; Metrics</SectionLabel>
          <InlineTextarea
            value={draft.result}
            onChange={(e) => patch({ result: e.target.value })}
            placeholder={hint(draft.template, "result")}
            rows={4}
          />

          <div className="mt-6">
            <SectionLabel>Skills &amp; Technologies</SectionLabel>
            <SkillsAndTechnologies skills={draft.skills} onChange={(skills) => patch({ skills })} />
          </div>

          <div className="mt-6">
            <SectionLabel>Tags</SectionLabel>
            <TypedTagPicker projectId={projectId} userId={userId} />
          </div>
        </section>

        {/* ============ REFLECTION ============ */}
        <section id="reflection" aria-labelledby="reflection-heading">
          <SectionLabel id="reflection-heading">Reflection</SectionLabel>
          <InlineTextarea
            value={draft.reflection}
            onChange={(e) => patch({ reflection: e.target.value })}
            placeholder={hint(draft.template, "reflection")}
            rows={4}
          />
        </section>
      </div>

      {/* ============ PUBLISH CONFIRMATION ============ */}
      <AlertDialog open={publishOpen} onOpenChange={setPublishOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish this project?</AlertDialogTitle>
            <AlertDialogDescription>
              Publishing makes this project visible on your public profile and reachable by anyone
              with the link — no login required. You can revert it to a draft at any time; nothing
              is deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setStatus.mutate({ id: projectId, status: "published", userId });
                setPublishOpen(false);
              }}
            >
              Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============ DELETE CONFIRMATION ============ */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete “{draft.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the project, its milestones, and its artifacts for good — this can&apos;t
              be undone. If you just want it out of sight, archive it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[var(--error)] text-white hover:bg-[var(--error)]/90"
              onClick={() => {
                deleteProject.mutate(
                  { id: projectId, userId },
                  { onSuccess: () => navigate({ to: "/dashboard/projects" }) },
                );
              }}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProjectMenu({
  project,
  shareUrl,
  onPublish,
  onRevertToDraft,
  onArchive,
  onDelete,
}: {
  project: Project;
  shareUrl: string;
  onPublish: () => void;
  onRevertToDraft: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Project actions"
          className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--ink-3)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {project.status !== "published" ? (
          <DropdownMenuItem onClick={onPublish}>
            <Globe className="mr-2 h-4 w-4" /> Publish
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard?.writeText(shareUrl);
              }}
            >
              <Copy className="mr-2 h-4 w-4" /> Copy share link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRevertToDraft}>
              <RotateCcw className="mr-2 h-4 w-4" /> Revert to draft
            </DropdownMenuItem>
          </>
        )}
        {project.status !== "archived" ? (
          <DropdownMenuItem onClick={onArchive}>
            <Archive className="mr-2 h-4 w-4" /> Archive
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onRevertToDraft}>
            <RotateCcw className="mr-2 h-4 w-4" /> Restore to draft
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-[var(--error)] focus:text-[var(--error)]">
          <Trash2 className="mr-2 h-4 w-4" /> Delete permanently
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-24 rounded brio-skeleton" />
      <div className="h-56 rounded-lg brio-skeleton" />
      <div className="h-9 rounded-lg brio-skeleton" />
      <div className="h-32 rounded-lg brio-skeleton" />
      <div className="h-32 rounded-lg brio-skeleton" />
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <h2 className="text-[18px] font-medium text-[var(--ink)]">Project not found</h2>
      <p className="mt-2 max-w-sm text-[13px] text-[var(--ink-2)]">
        This project doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link to="/dashboard/projects" className="mt-5">
        <Button variant="secondary">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to projects
        </Button>
      </Link>
    </div>
  );
}
