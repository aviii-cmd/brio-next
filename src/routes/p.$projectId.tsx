import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, ExternalLink, FileText, Play, Github, Figma } from "lucide-react";
import { Avatar } from "@/components/brio/ui";
import { usePublicProject, useProjectMilestones, useProjectArtifacts, useProjectTags } from "@/hooks/useProjectWorkspace";
import { useProfile } from "@/hooks/useData";
import type { ProjectArtifact } from "@/types/database";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/p/$projectId")({
  head: () => ({ meta: [{ title: "Project — Brio" }] }),
  component: PublicProjectPage,
});

function PublicProjectPage() {
  const { projectId } = Route.useParams();
  const { data: project, isLoading, isFetched } = usePublicProject(projectId);
  const { data: profile } = useProfile(project?.user_id);
  const { data: milestones = [] } = useProjectMilestones(project ? projectId : undefined);
  const { data: artifacts = [] } = useProjectArtifacts(project ? projectId : undefined);
  const { data: tags = [] } = useProjectTags(project ? projectId : undefined);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-12">
        <div className="h-56 rounded-lg brio-skeleton" />
        <div className="mt-6 h-8 w-2/3 rounded brio-skeleton" />
      </div>
    );
  }

  if (isFetched && !project) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <h1 className="text-[20px] font-medium text-[var(--ink)]">This project isn&apos;t available</h1>
        <p className="mt-2 max-w-sm text-[13px] text-[var(--ink-2)]">
          It may have been unpublished, or the link is incorrect.
        </p>
        <Link to="/" className="mt-5 text-[13px] font-medium text-[var(--ink)] underline underline-offset-2">
          Go to Brio
        </Link>
      </div>
    );
  }

  if (!project) return null;

  const skillTags = tags.filter((t) => t.type === "tech" || t.type === "domain");

  return (
    <div className="min-h-dvh bg-[var(--surface)]">
      <header className="border-b border-[var(--surface-3)] bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link to="/" className="text-[15px] font-medium tracking-[-0.01em] text-[var(--ink)]">
            Brio
          </Link>
          {profile && (
            <div className="flex items-center gap-2">
              <Avatar size="sm" initials={profile.initials} />
              <span className="text-[13px] text-[var(--ink-2)]">{profile.name}</span>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-20 pt-8 sm:px-6">
        {project.cover_image_url && (
          <div className="mb-6 aspect-[16/9] overflow-hidden rounded-lg bg-[var(--surface-2)]">
            <img src={project.cover_image_url} alt="" className="h-full w-full object-cover" />
          </div>
        )}

        <h1 className="text-[28px] font-medium leading-[1.2] tracking-[-0.02em] text-[var(--ink)] sm:text-[34px]">
          {project.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--ink-2)]">
          {project.role && <span>{project.role}</span>}
          {project.type && <span className="text-[var(--ink-3)]">{project.type}</span>}
          {project.date && <span className="text-[var(--ink-3)]">{project.date}</span>}
          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-[var(--ink)] underline underline-offset-2"
            >
              View live <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {project.summary && (
          <p className="mt-5 text-[17px] leading-[1.6] text-[var(--ink-2)]">{project.summary}</p>
        )}

        <div className="mt-10 space-y-2 divide-y divide-[var(--surface-3)]">
          {project.problem && (
            <CollapsibleSection title="Problem & Objectives">
              <Prose text={project.problem} />
              {project.constraints && (
                <div className="mt-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--ink-3)]">
                    Constraints
                  </p>
                  <Prose text={project.constraints} />
                </div>
              )}
            </CollapsibleSection>
          )}

          {(project.action || milestones.length > 0) && (
            <CollapsibleSection title="Solution & Process">
              {project.action && <Prose text={project.action} />}
              {milestones.length > 0 && (
                <ol className="mt-4 space-y-4 border-l border-[var(--surface-3)] pl-4">
                  {milestones.map((m) => (
                    <li key={m.id}>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-[14px] font-medium text-[var(--ink)]">{m.title}</span>
                        {m.milestone_date && (
                          <span className="text-[11px] uppercase tracking-[0.02em] text-[var(--ink-3)]">
                            {m.milestone_date}
                          </span>
                        )}
                      </div>
                      {m.description && <p className="mt-1 text-[14px] text-[var(--ink-2)]">{m.description}</p>}
                      {m.outcome && <p className="mt-1 text-[13px] text-[var(--success)]">→ {m.outcome}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </CollapsibleSection>
          )}

          {artifacts.length > 0 && (
            <CollapsibleSection title="Artifacts">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {artifacts.map((a) => (
                  <PublicArtifactCard key={a.id} artifact={a} />
                ))}
              </div>
            </CollapsibleSection>
          )}

          {project.result && (
            <CollapsibleSection title="Results & Metrics">
              <Prose text={project.result} />
            </CollapsibleSection>
          )}

          {(project.skills.length > 0 || skillTags.length > 0) && (
            <CollapsibleSection title="Skills & Technologies">
              <div className="flex flex-wrap gap-1.5">
                {project.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-[var(--surface-3)] bg-[var(--surface-2)] px-2.5 py-1 text-[12px] text-[var(--ink-2)]"
                  >
                    {s}
                  </span>
                ))}
                {skillTags.map((t) => (
                  <span
                    key={t.id}
                    className="rounded-full border border-[var(--surface-3)] px-2.5 py-1 text-[12px] text-[var(--ink-3)]"
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {project.reflection && (
            <CollapsibleSection title="Reflection">
              <Prose text={project.reflection} />
            </CollapsibleSection>
          )}
        </div>
      </main>

      <footer className="border-t border-[var(--surface-3)] py-6 text-center">
        <Link to="/" className="text-[12px] text-[var(--ink-3)] hover:text-[var(--ink-2)]">
          Built with Brio
        </Link>
      </footer>
    </div>
  );
}

function Prose({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-[15px] leading-[1.7] text-[var(--ink-2)]">
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i}>{para}</p>
      ))}
    </div>
  );
}

// Collapsible on mobile, but readable and open by default everywhere
// (PRD §6.2 — "clean typography and collapsible sections on mobile").
function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const headingId = `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section className="py-6" aria-labelledby={headingId}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <h2 id={headingId} className="text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-3)]">
          {title}
        </h2>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-[var(--ink-3)] transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="mt-4">{children}</div>}
    </section>
  );
}

function PublicArtifactCard({ artifact }: { artifact: ProjectArtifact }) {
  const url = artifact.url.toLowerCase();
  const icon =
    artifact.kind === "link" && url.includes("github.com") ? (
      <Github className="h-5 w-5" />
    ) : artifact.kind === "link" && url.includes("figma.com") ? (
      <Figma className="h-5 w-5" />
    ) : artifact.kind === "link" ? (
      <ExternalLink className="h-5 w-5" />
    ) : (
      <FileText className="h-5 w-5" />
    );

  return (
    <a
      href={artifact.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block overflow-hidden rounded-md border border-[var(--surface-3)] bg-white"
    >
      <div className="aspect-video w-full bg-[var(--surface-2)]">
        {artifact.kind === "image" ? (
          <img src={artifact.url} alt={artifact.caption} className="h-full w-full object-cover" />
        ) : artifact.kind === "video" ? (
          <div className="relative h-full w-full">
            <video src={artifact.url} className="h-full w-full object-cover" />
            <Play className="absolute inset-0 m-auto h-6 w-6 text-white drop-shadow" />
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-[var(--ink-3)]">
            {icon}
          </div>
        )}
      </div>
      {artifact.caption && (
        <p className="truncate border-t border-[var(--surface-3)] px-2 py-1.5 text-[12px] text-[var(--ink-2)]">
          {artifact.caption}
        </p>
      )}
    </a>
  );
}
