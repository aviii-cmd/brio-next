import * as React from "react";
import { useState } from "react";
import { Plus, Trash2, GripVertical, Check, X } from "lucide-react";
import { Button, Input, Textarea, FormField } from "@/components/brio/ui";
import {
  useProjectMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
  useReorderMilestones,
} from "@/hooks/useProjectWorkspace";
import { milestoneSchema, type MilestoneFormValues } from "@/lib/schemas";
import type { ProjectMilestone } from "@/types/database";

/**
 * Timeline & Milestones — anchors the "Solution & Process" narrative with
 * concrete dated steps and outcomes (PRD §5.2).
 */
export function MilestoneTimeline({ projectId }: { projectId: string }) {
  const { data: milestones = [], isLoading } = useProjectMilestones(projectId);
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useDeleteMilestone();
  const reorder = useReorderMilestones();

  const [addingOpen, setAddingOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const handleAdd = (values: MilestoneFormValues) => {
    createMilestone.mutate({
      project_id: projectId,
      title: values.title,
      description: values.description,
      milestone_date: values.milestone_date,
      outcome: values.outcome,
      sort_order: milestones.length,
    });
    setAddingOpen(false);
  };

  const handleReorder = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    const ids = milestones.map((m) => m.id);
    const fromIdx = ids.indexOf(draggedId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const reordered = [...ids];
    reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, draggedId);
    reorder.mutate({
      projectId,
      items: reordered.map((id, idx) => ({ id, sort_order: idx })),
    });
  };

  if (isLoading) return <div className="h-24 rounded-md brio-skeleton" />;

  return (
    <div>
      {milestones.length === 0 && !addingOpen ? (
        <div className="rounded-md border border-dashed border-[var(--surface-3)] px-4 py-5 text-center">
          <p className="text-[13px] text-[var(--ink-2)]">
            Break your process into dated steps — reviewers scan timelines faster than paragraphs.
          </p>
        </div>
      ) : (
        <ol className="space-y-0">
          {milestones.map((m, idx) => (
            <MilestoneRow
              key={m.id}
              milestone={m}
              isLast={idx === milestones.length - 1}
              onUpdate={(updates) => updateMilestone.mutate({ id: m.id, updates, projectId })}
              onDelete={() => deleteMilestone.mutate({ id: m.id, projectId })}
              draggable
              onDragStart={() => setDragId(m.id)}
              onDrop={() => dragId && handleReorder(dragId, m.id)}
            />
          ))}
        </ol>
      )}

      {addingOpen ? (
        <NewMilestoneForm onSave={handleAdd} onCancel={() => setAddingOpen(false)} />
      ) : (
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => setAddingOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add milestone
        </Button>
      )}
    </div>
  );
}

function MilestoneRow({
  milestone,
  isLast,
  onUpdate,
  onDelete,
  draggable,
  onDragStart,
  onDrop,
}: {
  milestone: ProjectMilestone;
  isLast: boolean;
  onUpdate: (updates: Partial<MilestoneFormValues>) => void;
  onDelete: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDrop?: () => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="relative py-3">
        <NewMilestoneForm
          initial={{
            title: milestone.title,
            description: milestone.description,
            milestone_date: milestone.milestone_date,
            outcome: milestone.outcome,
          }}
          onSave={(values) => {
            onUpdate(values);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li
      className="group relative flex gap-3 py-3"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div className="flex flex-col items-center">
        <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-[var(--ink-3)] opacity-0 transition-opacity group-hover:opacity-100" />
        <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[var(--ink)]" />
        {!isLast && <span className="mt-1 w-px flex-1 bg-[var(--surface-3)]" />}
      </div>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="min-w-0 flex-1 pb-2 text-left"
      >
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-[14px] font-medium text-[var(--ink)]">{milestone.title}</span>
          {milestone.milestone_date && (
            <span className="text-[11px] uppercase tracking-[0.02em] text-[var(--ink-3)]">
              {milestone.milestone_date}
            </span>
          )}
        </div>
        {milestone.description && (
          <p className="mt-1 text-[13px] text-[var(--ink-2)]">{milestone.description}</p>
        )}
        {milestone.outcome && (
          <p className="mt-1 text-[12px] text-[var(--success)]">→ {milestone.outcome}</p>
        )}
      </button>
      <button
        type="button"
        aria-label="Delete milestone"
        onClick={onDelete}
        className="h-7 w-7 shrink-0 self-start rounded-md text-[var(--ink-3)] opacity-0 transition-opacity hover:text-[var(--error)] group-hover:opacity-100"
      >
        <Trash2 className="mx-auto h-3.5 w-3.5" />
      </button>
    </li>
  );
}

function NewMilestoneForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: MilestoneFormValues;
  onSave: (values: MilestoneFormValues) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<MilestoneFormValues>(
    initial ?? { title: "", description: "", milestone_date: "", outcome: "" },
  );
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const parsed = milestoneSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid milestone");
      return;
    }
    onSave(parsed.data);
  };

  return (
    <div className="rounded-md border border-[var(--surface-3)] bg-[var(--surface-2)] p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <FormField label="Milestone title" required error={error ?? undefined}>
          <Input
            autoFocus
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            placeholder="e.g. Shipped MVP to 20 beta users"
          />
        </FormField>
        <FormField label="Date">
          <Input
            value={values.milestone_date}
            onChange={(e) => setValues((v) => ({ ...v, milestone_date: e.target.value }))}
            placeholder="Mar 2026"
          />
        </FormField>
      </div>
      <FormField label="What happened">
        <Textarea
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          placeholder="What did you do at this step?"
        />
      </FormField>
      <FormField label="Outcome" helper="Optional — the result of this specific step.">
        <Input
          value={values.outcome}
          onChange={(e) => setValues((v) => ({ ...v, outcome: e.target.value }))}
          placeholder="e.g. 40% faster load time"
        />
      </FormField>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-3.5 w-3.5" /> Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={submit}>
          <Check className="h-3.5 w-3.5" /> Save
        </Button>
      </div>
    </div>
  );
}
