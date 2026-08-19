import { Link } from "@tanstack/react-router";
import { AlertCircle, Check, Circle, Flag, Target } from "lucide-react";
import {
  useProjectMilestones,
  useProjectReadiness,
  useProjectTasks,
  useUpdateProjectTask,
} from "@/hooks/useProjectWorkspace";
import type { ProjectTask, ProjectTaskStatus } from "@/types/database";

const STATUS_LABELS: Record<ProjectTaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  blocked: "Blocked",
  review: "In review",
  done: "Done",
};

const BOARD_COLUMNS: { status: ProjectTaskStatus; label: string }[] = [
  { status: "todo", label: "Next up" },
  { status: "in_progress", label: "In progress" },
  { status: "blocked", label: "Blocked" },
  { status: "done", label: "Done" },
];

function startOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
}

export function ProjectPlanningHub({ projectId }: { projectId: string }) {
  const readiness = useProjectReadiness(projectId);
  const { data: tasks = [] } = useProjectTasks(projectId);
  const { data: milestones = [] } = useProjectMilestones(projectId);
  const updateTask = useUpdateProjectTask();

  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const taskProgress = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const overdueTasks = tasks.filter(
    (task) =>
      task.status !== "done" &&
      task.due_date &&
      new Date(`${task.due_date}T00:00:00`).getTime() < startOfToday(),
  );
  const health = readiness?.score ?? 0;
  const healthLabel = health >= 80 ? "Strong" : health >= 35 ? "Building" : "Needs attention";

  return (
    <section className="mb-8 rounded-lg border border-[var(--surface-3)] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-[var(--accent-warm)]" />
            <h2 className="text-[15px] font-medium text-[var(--ink)]">Project Planning Hub</h2>
          </div>
          <p className="mt-1 text-[12px] text-[var(--ink-3)]">
            See what is complete, what is moving, and what needs attention.
          </p>
        </div>
        <Link
          to="/dashboard/projects/$projectId"
          params={{ projectId }}
          hash="process"
          className="text-[12px] text-[var(--ink-2)] hover:text-[var(--ink)]"
        >
          Open full workflow →
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HealthStat label="Project health" value={`${health}%`} detail={healthLabel} />
        <HealthStat
          label="Task progress"
          value={`${taskProgress}%`}
          detail={`${completedTasks}/${tasks.length} complete`}
        />
        <HealthStat label="Milestones" value={`${milestones.length}`} detail="Recorded steps" />
        <HealthStat
          label="Needs attention"
          value={`${overdueTasks.length}`}
          detail={overdueTasks.length === 1 ? "Overdue task" : "Overdue tasks"}
          danger={overdueTasks.length > 0}
        />
      </div>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
        <div
          className="h-full rounded-full bg-[var(--ink)] transition-all"
          style={{ width: `${health}%` }}
        />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {BOARD_COLUMNS.map((column) => {
          const columnTasks = tasks.filter((task) => task.status === column.status).slice(0, 3);
          return (
            <div
              key={column.status}
              className="rounded-md border border-[var(--surface-3)] bg-[var(--surface-2)] p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--ink-2)]">
                  {column.label}
                </span>
                <span className="text-[11px] text-[var(--ink-3)]">
                  {tasks.filter((task) => task.status === column.status).length}
                </span>
              </div>
              <div className="mt-2 space-y-2">
                {columnTasks.length === 0 && (
                  <div className="text-[11px] text-[var(--ink-3)]">Nothing here yet.</div>
                )}
                {columnTasks.map((task) => (
                  <PlanningTaskRow
                    task={task}
                    onStatusChange={(status) =>
                      updateTask.mutate({ id: task.id, projectId, updates: { status } })
                    }
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HealthStat({
  label,
  value,
  detail,
  danger,
}: {
  label: string;
  value: string;
  detail: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-md border border-[var(--surface-3)] px-3 py-3">
      <div className="text-[10px] uppercase tracking-[0.05em] text-[var(--ink-3)]">{label}</div>
      <div
        className={`mt-1 text-[22px] font-light tracking-[-0.02em] ${danger ? "text-[var(--error)]" : "text-[var(--ink)]"}`}
      >
        {value}
      </div>
      <div className="text-[11px] text-[var(--ink-3)]">{detail}</div>
    </div>
  );
}

function PlanningTaskRow({
  task,
  onStatusChange,
}: {
  task: ProjectTask;
  onStatusChange: (status: ProjectTaskStatus) => void;
}) {
  return (
    <div className="rounded border border-[var(--surface-3)] bg-white px-2.5 py-2">
      <div className="flex items-start gap-2">
        {task.status === "done" ? (
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--success)]" />
        ) : task.status === "blocked" ? (
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--error)]" />
        ) : (
          <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ink-3)]" />
        )}
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-[12px] text-[var(--ink)]">{task.title}</div>
          <select
            aria-label={`Status for ${task.title}`}
            value={task.status}
            onChange={(event) => onStatusChange(event.target.value as ProjectTaskStatus)}
            className="mt-1 max-w-full rounded border border-[var(--surface-3)] bg-white px-1 py-0.5 text-[10px] text-[var(--ink-2)]"
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {task.priority === "high" && (
          <Flag className="h-3.5 w-3.5 shrink-0 text-[var(--accent-warm)]" />
        )}
      </div>
    </div>
  );
}
