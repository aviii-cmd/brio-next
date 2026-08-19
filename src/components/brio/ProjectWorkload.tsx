import { Link } from "@tanstack/react-router";
import { AlertCircle, CalendarDays, Check, Circle } from "lucide-react";
import { useProjectWorkload, type WorkloadTask } from "@/hooks/useProjectWorkspace";
import type { ProjectTaskStatus } from "@/types/database";

const STATUS_LABELS: Record<ProjectTaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  blocked: "Blocked",
  review: "In review",
  done: "Done",
};

function dayStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function taskDueTime(task: WorkloadTask) {
  return task.due_date ? dayStart(new Date(`${task.due_date}T00:00:00`)) : null;
}

export function ProjectWorkload({ userId }: { userId: string | undefined }) {
  const { data: tasks = [], isLoading, isError } = useProjectWorkload(userId);
  const today = dayStart(new Date());
  const tomorrow = today + 24 * 60 * 60 * 1000;

  const overdue = tasks.filter(
    (task) => task.status !== "done" && taskDueTime(task) !== null && taskDueTime(task)! < today,
  );
  const todayTasks = tasks.filter((task) => task.status !== "done" && taskDueTime(task) === today);
  const blocked = tasks.filter((task) => task.status === "blocked");
  const upcoming = tasks.filter((task) => {
    const due = taskDueTime(task);
    return task.status !== "done" && due !== null && due >= tomorrow;
  });
  const done = tasks.filter((task) => task.status === "done").slice(0, 4);

  const groups = [
    {
      label: "Overdue",
      tasks: overdue,
      icon: <AlertCircle className="h-4 w-4 text-[var(--error)]" />,
    },
    {
      label: "Today",
      tasks: todayTasks,
      icon: <CalendarDays className="h-4 w-4 text-[var(--accent-warm)]" />,
    },
    { label: "Blocked", tasks: blocked, icon: <Circle className="h-4 w-4 text-[var(--ink-3)]" /> },
    {
      label: "Upcoming",
      tasks: upcoming,
      icon: <CalendarDays className="h-4 w-4 text-[var(--ink-3)]" />,
    },
    {
      label: "Recently done",
      tasks: done,
      icon: <Check className="h-4 w-4 text-[var(--success)]" />,
    },
  ].filter((group) => group.tasks.length > 0);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-medium text-[var(--ink)]">Project workload</h2>
          <p className="mt-1 text-[11px] text-[var(--ink-3)]">
            Your current project work in one place.
          </p>
        </div>
        <Link
          to="/dashboard/projects"
          className="text-[13px] text-[var(--ink-2)] hover:text-[var(--ink)]"
        >
          View projects →
        </Link>
      </div>

      {isLoading && (
        <div className="rounded-lg border border-[var(--surface-3)] bg-white px-5 py-6 text-[13px] text-[var(--ink-3)]">
          Loading workload…
        </div>
      )}
      {isError && (
        <div className="rounded-lg border border-[var(--surface-3)] bg-white px-5 py-6 text-[13px] text-[var(--error)]">
          Workload could not be loaded. Try refreshing.
        </div>
      )}
      {!isLoading && !isError && groups.length === 0 && (
        <div className="rounded-lg border border-dashed border-[var(--surface-3)] bg-white px-5 py-6 text-[13px] text-[var(--ink-3)]">
          Add tasks inside a project to see your workload here.
        </div>
      )}
      {!isLoading && !isError && groups.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-2">
          {groups.map((group) => (
            <div key={group.label} className="rounded-lg border border-[var(--surface-3)] bg-white">
              <div className="flex items-center gap-2 border-b border-[var(--surface-3)] px-4 py-3">
                {group.icon}
                <span className="text-[13px] font-medium text-[var(--ink)]">{group.label}</span>
                <span className="text-[11px] text-[var(--ink-3)]">{group.tasks.length}</span>
              </div>
              <div className="divide-y divide-[var(--surface-3)]">
                {group.tasks.map((task) => (
                  <WorkloadTaskRow key={`${group.label}-${task.id}`} task={task} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function WorkloadTaskRow({ task }: { task: WorkloadTask }) {
  return (
    <Link
      to="/dashboard/projects/$projectId"
      params={{ projectId: task.project_id }}
      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-2)]"
    >
      <div className="mt-0.5 shrink-0 text-[var(--ink-3)]">
        {task.status === "done" ? (
          <Check className="h-4 w-4 text-[var(--success)]" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={`text-[13px] ${task.status === "done" ? "text-[var(--ink-3)] line-through" : "text-[var(--ink)]"}`}
        >
          {task.title}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--ink-3)]">
          <span>{task.projectTitle}</span>
          <span>·</span>
          <span>{STATUS_LABELS[task.status]}</span>
          {task.due_date && (
            <>
              <span>·</span>
              <span>{task.due_date}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
