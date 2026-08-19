import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plus,
  Folders,
  LayoutGrid,
  List as ListIcon,
  Search,
  Sparkles,
} from "lucide-react";
import { PageHeader, Button, EmptyState, Input, FormField, Textarea } from "@/components/brio/ui";
import { Drawer } from "@/components/brio/Drawer";
import { ProjectCard } from "@/components/brio/ProjectsUI";
import { CommandPaletteTrigger } from "@/components/brio/CommandPalette";
import { useAuth } from "@/hooks/useAuth";
import { useProjects, useCreateProject } from "@/hooks/useData";
import { PROJECT_TEMPLATES, PROJECT_TYPES, projectCreateSchema, type ProjectCreateValues } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { Project, ProjectStatus } from "@/types/database";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/projects")({
  head: () => ({ meta: [{ title: "Projects — Brio" }] }),
  component: ProjectsHome,
});

type StatusFilter = "all" | ProjectStatus;
type ViewMode = "grid" | "list";

// Narrative completeness approximation for the card readiness bar — the
// full readiness score (with milestones/artifacts/tags) lives on the
// project detail page and is more expensive to compute for a whole list.
function narrativeCompleteness(p: Project): number {
  const fields = [p.summary, p.problem, p.action, p.result, p.reflection];
  const filled = fields.filter((f) => f.trim().length > 0).length;
  return Math.round((filled / fields.length) * 100);
}

function ProjectsHome() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const { data: projects = [], isLoading } = useProjects(user?.id);
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [createOpen, setCreateOpen] = useState(false);

  const allTypes = useMemo(
    () => Array.from(new Set(projects.map((p) => p.type))).sort(),
    [projects],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = { all: projects.length, draft: 0, published: 0, archived: 0 };
    for (const p of projects) counts[p.status]++;
    return counts;
  }, [projects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (q) {
        const haystack = `${p.title} ${p.type} ${p.role} ${p.skills.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [projects, statusFilter, typeFilter, search]);

  const featured = useMemo(
    () => projects.filter((p) => p.featured && p.status !== "archived"),
    [projects],
  );
  const needsPolishing = useMemo(
    () =>
      projects
        .filter((p) => p.status === "draft" && narrativeCompleteness(p) < 60)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 3),
    [projects],
  );
  const isFilteredView = statusFilter !== "all" || typeFilter !== "all" || search.trim().length > 0;

  const createProject = useCreateProject();

  const handleCreate = (values: ProjectCreateValues) => {
    if (!userId) return;
    createProject.mutate(
      {
        user_id: userId,
        title: values.title,
        type: values.type,
        role: values.role,
        summary: values.summary,
        template: values.template,
        date: String(new Date().getFullYear()),
        start_year: new Date().getFullYear(),
      },
      {
        onSuccess: (project) => {
          setCreateOpen(false);
          navigate({ to: "/dashboard/projects/$projectId", params: { projectId: project.id } });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Projects" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 rounded-lg brio-skeleton" />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Turn raw work into polished case studies."
        action={
          <div className="flex items-center gap-2">
            <CommandPaletteTrigger onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))} />
            <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New project
            </Button>
          </div>
        }
      />

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--surface-3)] bg-[var(--surface-2)]">
          <EmptyState
            icon={<Folders className="h-6 w-6" />}
            title="No projects yet"
            body="Projects are the core of your Brio profile. Each one tells a story: the context, the process, and the outcome."
            cta={
              <Button variant="primary" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Add your first project
              </Button>
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          {/* Side rail: status + type filters */}
          <aside className="lg:w-48 lg:shrink-0">
            <nav aria-label="Project filters" className="flex gap-1.5 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
              {(["all", "draft", "published", "archived"] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "flex shrink-0 items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-[13px] transition-colors",
                    statusFilter === s
                      ? "bg-[var(--surface-2)] font-medium text-[var(--ink)]"
                      : "text-[var(--ink-2)] hover:bg-[var(--surface-2)]",
                  )}
                >
                  <span className="capitalize">{s === "all" ? "All projects" : s}</span>
                  <span className="text-[11px] text-[var(--ink-3)]">{statusCounts[s]}</span>
                </button>
              ))}
            </nav>
            {allTypes.length > 0 && (
              <div className="mt-4 hidden lg:block">
                <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--ink-3)]">
                  Type
                </div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-9 w-full rounded-[4px] border border-[var(--surface-3)] bg-white px-2 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--ink)]"
                >
                  <option value="all">All types</option>
                  {allTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}
          </aside>

          <div className="min-w-0 flex-1 space-y-10">
            {/* Search + view toggle */}
            <div className="flex items-center gap-3">
              <Input
                icon={<Search className="h-4 w-4" />}
                placeholder="Search projects…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search projects"
              />
              <div className="flex shrink-0 items-center rounded-[4px] border border-[var(--surface-3)] bg-white p-0.5">
                <button
                  aria-label="Grid view"
                  aria-pressed={view === "grid"}
                  onClick={() => setView("grid")}
                  className={cn("flex h-7 w-7 items-center justify-center rounded-[3px]", view === "grid" ? "bg-[var(--surface-2)] text-[var(--ink)]" : "text-[var(--ink-3)]")}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  aria-label="List view"
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                  className={cn("flex h-7 w-7 items-center justify-center rounded-[3px]", view === "list" ? "bg-[var(--surface-2)] text-[var(--ink)]" : "text-[var(--ink-3)]")}
                >
                  <ListIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {!isFilteredView && featured.length > 0 && (
              <section aria-labelledby="featured-heading">
                <h2 id="featured-heading" className="mb-3 text-[13px] font-medium text-[var(--ink)]">
                  Featured
                </h2>
                <div className={view === "grid" ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
                  {featured.map((p) => (
                    <ProjectCard key={p.id} project={p} view={view} readinessScore={narrativeCompleteness(p)} />
                  ))}
                </div>
              </section>
            )}

            {!isFilteredView && needsPolishing.length > 0 && (
              <section aria-labelledby="polish-heading">
                <h2 id="polish-heading" className="mb-3 flex items-center gap-1.5 text-[13px] font-medium text-[var(--ink)]">
                  <Sparkles className="h-3.5 w-3.5 text-[var(--accent-warm)]" />
                  Needs polishing
                </h2>
                <div className={view === "grid" ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
                  {needsPolishing.map((p) => (
                    <ProjectCard key={p.id} project={p} view={view} readinessScore={narrativeCompleteness(p)} />
                  ))}
                </div>
              </section>
            )}

            <section aria-labelledby="all-heading">
              <h2 id="all-heading" className="mb-3 text-[13px] font-medium text-[var(--ink)]">
                {isFilteredView ? `${filtered.length} project${filtered.length === 1 ? "" : "s"}` : "All projects"}
              </h2>
              {filtered.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--surface-3)] bg-[var(--surface-2)] py-10 text-center text-[13px] text-[var(--ink-2)]">
                  No projects match these filters.
                </div>
              ) : (
                <div className={view === "grid" ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
                  {filtered.map((p) => (
                    <ProjectCard key={p.id} project={p} view={view} readinessScore={narrativeCompleteness(p)} />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      <CreateProjectDrawer open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
    </>
  );
}

function CreateProjectDrawer({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (values: ProjectCreateValues) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProjectCreateValues>({
    resolver: zodResolver(projectCreateSchema),
    defaultValues: { title: "", type: "Personal Project", role: "", summary: "", template: "blank" },
  });

  React.useEffect(() => {
    if (open) reset({ title: "", type: "Personal Project", role: "", summary: "", template: "blank" });
  }, [open, reset]);

  const template = watch("template");

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New project"
      footer={
        <Button variant="primary" size="lg" className="w-full" onClick={handleSubmit(onCreate)}>
          Create project
        </Button>
      }
    >
      <p className="mb-5 text-[13px] text-[var(--ink-2)]">
        Start with the basics — you can fill in the full story once you&apos;re on the project page.
      </p>
      <FormField label="Project title" required error={errors.title?.message}>
        <Input {...register("title")} error={!!errors.title} placeholder="e.g. Campus food-waste tracker" autoFocus />
      </FormField>
      <FormField label="Type">
        <select
          {...register("type")}
          className="h-9 w-full rounded-[4px] border border-[var(--surface-3)] bg-white px-3 text-[15px] text-[var(--ink)] outline-none focus:border-[var(--ink)]"
        >
          {PROJECT_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </FormField>
      <FormField label="Your role">
        <Input {...register("role")} placeholder="e.g. Team lead, Sole builder" />
      </FormField>
      <FormField label="Summary" helper="2-3 sentences — the problem and outcome, in brief.">
        <Textarea {...register("summary")} placeholder="A short overview of what this project is and why it matters." />
      </FormField>
      <FormField label="Template" helper="Pre-fills section hints for common project types.">
        <div className="grid grid-cols-2 gap-2">
          {PROJECT_TEMPLATES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setValue("template", t.value)}
              className={cn(
                "rounded-md border px-3 py-2 text-left text-[13px] transition-colors",
                template === t.value
                  ? "border-[var(--ink)] bg-[var(--surface-2)] font-medium text-[var(--ink)]"
                  : "border-[var(--surface-3)] text-[var(--ink-2)] hover:bg-[var(--surface-2)]",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </FormField>
    </Drawer>
  );
}
