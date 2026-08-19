import { useMemo, useState } from "react";
import { Check, Circle, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button, FormField, Input } from "@/components/brio/ui";
import {
  useCreateProjectTask,
  useDeleteProjectTask,
  useProjectTasks,
  useUpdateProjectTask,
} from "@/hooks/useProjectWorkspace";
import type { ProjectTask, ProjectTaskPriority, ProjectTaskStatus } from "@/types/database";

const STATUS_LABELS: Record<ProjectTaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  blocked: "Blocked",
  review: "In review",
  done: "Done",
};

const PRIORITY_LABELS: Record<ProjectTaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function ProjectTaskList({ projectId, userId }: { projectId: string; userId: string }) {
  const { data: tasks = [], isLoading, isError } = useProjectTasks(projectId);
  const createTask = useCreateProjectTask();
  const updateTask = useUpdateProjectTask();
  const deleteTask = useDeleteProjectTask();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<ProjectTaskPriority>("medium");

  const nextTask = useMemo(() => tasks.find((task) => task.status !== "done"), [tasks]);

  const addTask = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || createTask.isPending) return;
    createTask.mutate(
      {
        project_id: projectId,
        user_id: userId,
        title: trimmedTitle,
        due_date: dueDate || null,
        priority,
        sort_order: tasks.length,
      },
      {
        onSuccess: () => {
          setTitle("");
          setDueDate("");
          setPriority("medium");
          setIsAdding(false);
        },
      },
    );
  };

  return (
    <div className="mt-6 rounded-lg border border-[var(--surface-3)] bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-medium text-[var(--ink)]">Project tasks</h3>
          <p className="mt-1 text-[12px] text-[var(--ink-3)]">
            Keep the next step visible while you build.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setIsAdding((value) => !value)}>
          <Plus className="h-3.5 w-3.5" /> {isAdding ? "Cancel" : "Add task"}
        </Button>
      </div>

      {nextTask && (
        <div className="mt-4 rounded-md bg-[var(--surface-2)] px-3 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-3)]">
            Next action
          </div>
          <div className="mt-1 text-[13px] font-medium text-[var(--ink)]">{nextTask.title}</div>
        </div>
      )}

      {isAdding && (
        <div className="mt-4 rounded-md border border-[var(--surface-3)] bg-[var(--surface-2)] p-3">
          <FormField label="Task title" required>
            <Input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Add results to the project page"
              onKeyDown={(event) => {
                if (event.key === "Enter") addTask();
              }}
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Due date">
              <Input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </FormField>
            <FormField label="Priority">
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as ProjectTaskPriority)}
                className="h-9 w-full rounded-md border border-[var(--surface-3)] bg-white px-2.5 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--ink)]"
              >
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="primary" size="sm" onClick={addTask} loading={createTask.isPending}>
              Add task
            </Button>
          </div>
        </div>
      )}

      {isLoading && <p className="mt-5 text-[13px] text-[var(--ink-3)]">Loading tasks…</p>}
      {isError && (
        <p className="mt-5 text-[13px] text-[var(--error)]">
          Tasks could not be loaded. Try refreshing.
        </p>
      )}
      {!isLoading && !isError && tasks.length === 0 && !isAdding && (
        <p className="mt-5 rounded-md border border-dashed border-[var(--surface-3)] px-3 py-4 text-[13px] text-[var(--ink-3)]">
          No tasks yet. Add the next concrete step for this project.
        </p>
      )}
      <div className="mt-4 space-y-2">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            projectId={projectId}
            onStatusChange={(status) =>
              updateTask.mutate({ id: task.id, projectId, updates: { status } })
            }
            onUpdate={(updates) => updateTask.mutate({ id: task.id, projectId, updates })}
            onDelete={() => deleteTask.mutate({ id: task.id, projectId })}
          />
        ))}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  projectId,
  onStatusChange,
  onUpdate,
  onDelete,
}: {
  task: ProjectTask;
  projectId: string;
  onStatusChange: (status: ProjectTaskStatus) => void;
  onUpdate: (updates: {
    title?: string;
    due_date?: string | null;
    priority?: ProjectTaskPriority;
  }) => void;
  onDelete: () => void;
}) {
  const isDone = task.status === "done";
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [priority, setPriority] = useState<ProjectTaskPriority>(task.priority);

  const saveEdits = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    onUpdate({ title: trimmedTitle, due_date: dueDate || null, priority });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="rounded-md border border-[var(--surface-3)] bg-[var(--surface-2)] p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[12px] font-medium text-[var(--ink)]">Edit task</div>
          <button
            type="button"
            aria-label="Cancel task editing"
            onClick={() => setEditing(false)}
            className="rounded p-1 text-[var(--ink-3)] hover:text-[var(--ink)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-3">
          <FormField label="Task title" required>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
          </FormField>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Due date">
            <Input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </FormField>
          <FormField label="Priority">
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as ProjectTaskPriority)}
              className="h-9 w-full rounded-md border border-[var(--surface-3)] bg-white px-2.5 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--ink)]"
            >
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={saveEdits} disabled={!title.trim()}>
            Save changes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-2 rounded-md border border-[var(--surface-3)] px-3 py-2.5">
      <button
        type="button"
        aria-label={isDone ? `Reopen ${task.title}` : `Complete ${task.title}`}
        onClick={() => onStatusChange(isDone ? "todo" : "done")}
        className="mt-0.5 shrink-0 text-[var(--ink-3)] hover:text-[var(--ink)]"
      >
        {isDone ? (
          <Check className="h-4 w-4 text-[var(--success)]" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div
          className={`text-[13px] ${isDone ? "text-[var(--ink-3)] line-through" : "text-[var(--ink)]"}`}
        >
          {task.title}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--ink-3)]">
          <select
            aria-label={`Status for ${task.title}`}
            value={task.status}
            onChange={(event) => onStatusChange(event.target.value as ProjectTaskStatus)}
            className="rounded border border-[var(--surface-3)] bg-white px-1.5 py-0.5 text-[11px] text-[var(--ink-2)]"
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <span>{PRIORITY_LABELS[task.priority]} priority</span>
          {task.due_date && <span>Due {task.due_date}</span>}
        </div>
      </div>
      <button
        type="button"
        aria-label={`Edit ${task.title}`}
        onClick={() => setEditing(true)}
        className="mt-0.5 rounded p-1 text-[var(--ink-3)] opacity-0 transition-opacity hover:text-[var(--ink)] group-hover:opacity-100"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label={`Delete ${task.title}`}
        onClick={onDelete}
        className="mt-0.5 rounded p-1 text-[var(--ink-3)] opacity-0 transition-opacity hover:text-[var(--error)] group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
