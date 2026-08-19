import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Check, Loader2, AlertCircle, Star, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project, ProjectStatus } from "@/types/database";
import type { AutosaveStatus } from "@/hooks/useProjectWorkspace";

// ============================================================
// STATUS BADGE
// ============================================================
export function StatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  const styles: Record<ProjectStatus, string> = {
    draft: "bg-[var(--surface-3)] text-[var(--ink-2)]",
    published: "text-white",
    archived: "bg-[var(--surface-2)] text-[var(--ink-3)] border border-[var(--surface-3)]",
  };
  const labels: Record<ProjectStatus, string> = {
    draft: "Draft",
    published: "Published",
    archived: "Archived",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-[0.02em]",
        styles[status],
        className,
      )}
      style={status === "published" ? { backgroundColor: "var(--success)" } : undefined}
    >
      {labels[status]}
    </span>
  );
}

// ============================================================
// AUTOSAVE INDICATOR
// ============================================================
export function AutosaveIndicator({ status, className }: { status: AutosaveStatus; className?: string }) {
  return (
    <div className={cn("flex items-center gap-1.5 text-[11px] text-[var(--ink-3)]", className)}>
      {status === "saving" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" /> Syncing…
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="h-3 w-3 text-[var(--success)]" /> Saved
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="h-3 w-3 text-[var(--error)]" /> Couldn&apos;t save — retrying
        </>
      )}
    </div>
  );
}

// ============================================================
// INLINE EDITABLE FIELDS
// Continuous, silent autosave (PRD §6.1) — no Save button, just onChange.
// ============================================================
export const InlineText = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { error?: string }
>(({ className, error, ...props }, ref) => (
  <div>
    <input
      ref={ref}
      className={cn(
        "w-full rounded-[4px] border border-transparent bg-transparent px-2 py-1 -mx-2 outline-none transition-all duration-150",
        "hover:border-[var(--surface-3)] focus:border-[var(--ink)] focus:bg-white focus:ring-2 focus:ring-[rgba(10,10,10,0.08)]",
        error && "border-[var(--error)]",
        className,
      )}
      {...props}
    />
    {error && <p className="mt-1 text-[11px] text-[var(--error)]">{error}</p>}
  </div>
));
InlineText.displayName = "InlineText";

export const InlineTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string; autoResize?: boolean }
>(({ className, error, autoResize = true, onInput, ...props }, ref) => {
  const localRef = React.useRef<HTMLTextAreaElement | null>(null);

  const resize = (el: HTMLTextAreaElement | null) => {
    if (!el || !autoResize) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  React.useEffect(() => {
    resize(localRef.current);
  }, [props.value]);

  return (
    <div>
      <textarea
        ref={(el) => {
          localRef.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        onInput={(e) => {
          resize(e.currentTarget);
          onInput?.(e);
        }}
        className={cn(
          "w-full resize-none overflow-hidden rounded-[4px] border border-transparent bg-transparent px-2 py-1.5 -mx-2 text-[15px] leading-[1.6] text-[var(--ink)] outline-none transition-all duration-150",
          "hover:border-[var(--surface-3)] focus:border-[var(--ink)] focus:bg-white focus:ring-2 focus:ring-[rgba(10,10,10,0.08)]",
          error && "border-[var(--error)]",
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-[11px] text-[var(--error)]">{error}</p>}
    </div>
  );
});
InlineTextarea.displayName = "InlineTextarea";

// ============================================================
// PROJECT READINESS BAR
// ============================================================
export function ReadinessBar({
  score,
  stageLabel,
  missing,
  compact,
}: {
  score: number;
  stageLabel: string;
  missing: string[];
  compact?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--ink-3)]">
          Project readiness
        </span>
        <span className="text-[11px] text-[var(--ink-3)]">{stageLabel}</span>
      </div>
      <div
        className="h-[3px] overflow-hidden rounded-full bg-[var(--surface-3)]"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Project readiness ${score}%`}
      >
        <div
          className="h-full rounded-full bg-[var(--ink)] transition-all duration-500"
          style={{ width: `${score}%` }}
        />
      </div>
      {!compact && missing.length > 0 && (
        <p className="mt-1.5 text-[11px] text-[var(--ink-3)]">
          Add {missing.slice(0, 2).join(" and ")}
          {missing.length > 2 ? `, +${missing.length - 2} more` : ""} to strengthen this case
          study.
        </p>
      )}
    </div>
  );
}

// ============================================================
// TAG CHIP
// ============================================================
const tagTypeStyles: Record<string, string> = {
  skill: "bg-[var(--surface-2)] border-[var(--surface-3)] text-[var(--ink-2)]",
  tech: "bg-[rgba(28,80,140,0.06)] border-[rgba(28,80,140,0.18)] text-[#1C508C]",
  domain: "bg-[rgba(200,98,42,0.06)] border-[rgba(200,98,42,0.18)] text-[var(--accent-warm)]",
};

export function TagChip({
  label,
  type = "skill",
  onRemove,
  className,
}: {
  label: string;
  type?: "skill" | "tech" | "domain";
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] tracking-[0.02em]",
        tagTypeStyles[type],
        className,
      )}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="text-current/60 hover:text-current"
        >
          ×
        </button>
      )}
    </span>
  );
}

// ============================================================
// PROJECT CARD (Projects Home grid/list)
// ============================================================
export function ProjectCard({
  project,
  view = "grid",
  readinessScore,
}: {
  project: Project;
  view?: "grid" | "list";
  readinessScore?: number;
}) {
  if (view === "list") {
    return (
      <Link
        to="/dashboard/projects/$projectId"
        params={{ projectId: project.id }}
        className="flex items-center gap-4 rounded-lg border border-[var(--surface-3)] bg-white px-4 py-3 transition-all duration-150 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--surface-2)]">
          {project.cover_image_url ? (
            <img src={project.cover_image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-4 w-4 text-[var(--ink-3)]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14px] font-medium text-[var(--ink)]">{project.title}</span>
            {project.featured && <Star className="h-3 w-3 shrink-0 fill-[var(--accent-warm)] text-[var(--accent-warm)]" />}
          </div>
          <div className="truncate text-[12px] text-[var(--ink-3)]">
            {project.type}
            {project.date ? ` · ${project.date}` : ""}
          </div>
        </div>
        <StatusBadge status={project.status} />
      </Link>
    );
  }

  return (
    <Link
      to="/dashboard/projects/$projectId"
      params={{ projectId: project.id }}
      className="group flex flex-col overflow-hidden rounded-lg border border-[var(--surface-3)] bg-white transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--surface-2)]">
        {project.cover_image_url ? (
          <img
            src={project.cover_image_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-6 w-6 text-[var(--ink-3)]" />
          </div>
        )}
        <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
          <StatusBadge status={project.status} className="shadow-sm" />
        </div>
        {project.featured && (
          <div className="absolute right-2.5 top-2.5">
            <Star className="h-4 w-4 fill-[var(--accent-warm)] text-[var(--accent-warm)] drop-shadow" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-[15px] font-medium leading-snug text-[var(--ink)]">{project.title}</h3>
        <div className="mt-1 text-[11px] uppercase tracking-[0.02em] text-[var(--ink-3)]">
          {project.type}
          {project.date ? ` · ${project.date}` : ""}
        </div>
        {project.summary && (
          <p className="mt-2 line-clamp-2 text-[13px] text-[var(--ink-2)]">{project.summary}</p>
        )}
        {typeof readinessScore === "number" && project.status !== "published" && (
          <div className="mt-3">
            <div className="h-[3px] overflow-hidden rounded-full bg-[var(--surface-3)]">
              <div
                className="h-full rounded-full bg-[var(--ink)] transition-all duration-500"
                style={{ width: `${readinessScore}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

// ============================================================
// SECTION LABEL (project page section headers)
// ============================================================
export function SectionLabel({
  children,
  id,
}: {
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <h2
      id={id}
      className="mb-3 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--ink-3)] scroll-mt-24"
    >
      {children}
    </h2>
  );
}
