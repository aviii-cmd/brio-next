import * as React from "react";
import { useRef, useState } from "react";
import {
  Upload,
  Link as LinkIcon,
  Trash2,
  FileText,
  Play,
  ExternalLink,
  Loader2,
  Github,
  Figma,
} from "lucide-react";
import { Button, Input, FormField } from "@/components/brio/ui";
import { InlineText } from "@/components/brio/ProjectsUI";
import {
  useProjectArtifacts,
  useUploadArtifact,
  useAddArtifactLink,
  useUpdateArtifact,
  useDeleteArtifact,
} from "@/hooks/useProjectWorkspace";
import { artifactLinkSchema } from "@/lib/schemas";
import type { ProjectArtifact } from "@/types/database";
import { cn } from "@/lib/utils";

const CATEGORIES = ["General", "Screenshots", "Demo", "Code", "Design", "Write-up"];

interface UploadTask {
  id: string;
  name: string;
  progress: number;
}

/**
 * Artifact Gallery — categorized screenshots, videos, files, and external
 * links (GitHub, Figma, etc.) with captions (PRD §4, §5.2, §8).
 */
export function ArtifactGallery({ projectId, userId }: { projectId: string; userId: string }) {
  const { data: artifacts = [], isLoading } = useProjectArtifacts(projectId);
  const uploadArtifact = useUploadArtifact();
  const addLink = useAddArtifactLink();
  const updateArtifact = useUpdateArtifact();
  const deleteArtifact = useDeleteArtifact();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [linkOpen, setLinkOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const taskId = crypto.randomUUID();
      setTasks((t) => [...t, { id: taskId, name: file.name, progress: 0 }]);
      uploadArtifact.mutate(
        {
          userId,
          projectId,
          file,
          onProgress: (pct) =>
            setTasks((t) => t.map((task) => (task.id === taskId ? { ...task, progress: pct } : task))),
        },
        {
          onSettled: () => setTasks((t) => t.filter((task) => task.id !== taskId)),
        },
      );
    });
  };

  const grouped = React.useMemo(() => {
    const map = new Map<string, ProjectArtifact[]>();
    for (const a of artifacts) {
      const list = map.get(a.category) ?? [];
      list.push(a);
      map.set(a.category, list);
    }
    return map;
  }, [artifacts]);

  if (isLoading) return <div className="h-32 rounded-md brio-skeleton" />;

  return (
    <div>
      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-6 text-center transition-colors",
          dragOver ? "border-[var(--ink)] bg-[var(--surface-2)]" : "border-[var(--surface-3)]",
        )}
      >
        <Upload className="h-5 w-5 text-[var(--ink-3)]" />
        <p className="text-[13px] text-[var(--ink-2)]">
          Drag files here, or{" "}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="font-medium text-[var(--ink)] underline underline-offset-2"
          >
            browse
          </button>
        </p>
        <p className="text-[11px] text-[var(--ink-3)]">Images, video, or PDF — up to 25MB</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Button variant="ghost" size="sm" className="mt-1" onClick={() => setLinkOpen((v) => !v)}>
          <LinkIcon className="h-3.5 w-3.5" /> Or add a link (GitHub, Figma…)
        </Button>
      </div>

      {linkOpen && <AddLinkForm projectId={projectId} onDone={() => setLinkOpen(false)} onAdd={addLink} />}

      {/* In-flight uploads: background completion with progress (PRD §8) */}
      {tasks.length > 0 && (
        <div className="mt-3 space-y-2">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-md border border-[var(--surface-3)] px-3 py-2">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--ink-3)]" />
              <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--ink-2)]">{t.name}</span>
              <div className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-[var(--surface-3)]">
                <div className="h-full bg-[var(--ink)] transition-all" style={{ width: `${t.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {artifacts.length === 0 && tasks.length === 0 ? (
        <p className="mt-4 text-[13px] text-[var(--ink-3)]">
          No evidence yet. Screenshots, demo videos, and links to GitHub or Figma all strengthen this
          project.
        </p>
      ) : (
        <div className="mt-5 space-y-6">
          {Array.from(grouped.entries()).map(([category, items]) => (
            <div key={category}>
              <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--ink-3)]">
                {category}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {items.map((a) => (
                  <ArtifactCard
                    key={a.id}
                    artifact={a}
                    onCaptionChange={(caption) => updateArtifact.mutate({ id: a.id, updates: { caption }, projectId })}
                    onDelete={() => deleteArtifact.mutate({ id: a.id, projectId })}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ArtifactCard({
  artifact,
  onCaptionChange,
  onDelete,
}: {
  artifact: ProjectArtifact;
  onCaptionChange: (caption: string) => void;
  onDelete: () => void;
}) {
  const [caption, setCaption] = useState(artifact.caption);

  return (
    <div className="group relative overflow-hidden rounded-md border border-[var(--surface-3)] bg-white">
      <a
        href={artifact.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block aspect-video w-full bg-[var(--surface-2)]"
      >
        {artifact.kind === "image" ? (
          <img src={artifact.url} alt={artifact.caption} className="h-full w-full object-cover" />
        ) : artifact.kind === "video" ? (
          <div className="relative h-full w-full">
            <video src={artifact.url} className="h-full w-full object-cover" />
            <Play className="absolute inset-0 m-auto h-6 w-6 text-white drop-shadow" />
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-[var(--ink-3)]">
            <ArtifactIcon artifact={artifact} />
            <span className="max-w-[90%] truncate text-[11px]">{artifact.file_name ?? artifact.url}</span>
          </div>
        )}
      </a>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete artifact"
        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
      >
        <Trash2 className="h-3 w-3" />
      </button>
      <InlineText
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        onBlur={() => {
          if (caption !== artifact.caption) onCaptionChange(caption);
        }}
        placeholder="Add a caption…"
        className="!-mx-0 border-t border-[var(--surface-3)] !rounded-none px-2 py-1.5 text-[12px]"
      />
    </div>
  );
}

function ArtifactIcon({ artifact }: { artifact: ProjectArtifact }) {
  const url = artifact.url.toLowerCase();
  if (artifact.kind === "link" && url.includes("github.com")) return <Github className="h-5 w-5" />;
  if (artifact.kind === "link" && url.includes("figma.com")) return <Figma className="h-5 w-5" />;
  if (artifact.kind === "link") return <ExternalLink className="h-5 w-5" />;
  return <FileText className="h-5 w-5" />;
}

function AddLinkForm({
  projectId,
  onAdd,
  onDone,
}: {
  projectId: string;
  onAdd: ReturnType<typeof useAddArtifactLink>;
  onDone: () => void;
}) {
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("General");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const parsed = artifactLinkSchema.safeParse({ url, category, caption });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid link");
      return;
    }
    onAdd.mutate({ projectId, link: parsed.data }, { onSuccess: onDone });
  };

  return (
    <div className="mt-3 rounded-md border border-[var(--surface-3)] bg-[var(--surface-2)] p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <FormField label="URL" required error={error ?? undefined}>
          <Input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/you/project"
          />
        </FormField>
        <FormField label="Category">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 w-full rounded-[4px] border border-[var(--surface-3)] bg-white px-2 text-[13px] outline-none focus:border-[var(--ink)]"
          >
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </FormField>
      </div>
      <FormField label="Caption" helper="Optional">
        <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="What is this?" />
      </FormField>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" loading={onAdd.isPending} onClick={submit}>
          Add link
        </Button>
      </div>
    </div>
  );
}
