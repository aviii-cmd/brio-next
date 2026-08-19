import { useMemo, useState } from "react";
import { ApplicationCard } from "./ApplicationCard";
import { TRACKER_COLUMNS } from "@/lib/opportunityUtils";
import { useUpdateApplicationStatus } from "@/hooks/useDiscover";
import type { ApplicationWithOpportunity } from "@/types/database";
import { cn } from "@/lib/utils";

export function KanbanBoard({
  applications,
  userId,
}: {
  applications: ApplicationWithOpportunity[];
  userId: string;
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const updateStatus = useUpdateApplicationStatus();

  const byColumn = useMemo(() => {
    const map = new Map<string, ApplicationWithOpportunity[]>();
    for (const col of TRACKER_COLUMNS) map.set(col.key, []);
    for (const app of applications) {
      const col = TRACKER_COLUMNS.find((c) => c.statuses.includes(app.status));
      if (col) map.get(col.key)?.push(app);
    }
    return map;
  }, [applications]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
      {TRACKER_COLUMNS.map((col) => {
        const items = byColumn.get(col.key) ?? [];
        return (
          <div
            key={col.key}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverColumn(col.key);
            }}
            onDragLeave={() => setDragOverColumn((c) => (c === col.key ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              setDragOverColumn(null);
              setDraggedId(null);
              if (!id) return;
              const app = applications.find((a) => a.id === id);
              if (!app || col.statuses.includes(app.status)) return;
              updateStatus.mutate({ id, status: col.statuses[0], userId });
            }}
            className={cn(
              "flex w-[280px] shrink-0 flex-col rounded-lg bg-[var(--surface)] p-2 transition-colors duration-150",
              dragOverColumn === col.key && "bg-[var(--surface-2)] ring-2 ring-[var(--surface-3)]",
            )}
          >
            <div className="mb-2 flex items-center justify-between px-1.5">
              <h3 className="text-[12px] font-medium uppercase tracking-[0.03em] text-[var(--ink-2)]">
                {col.label}
              </h3>
              <span className="rounded-full bg-[var(--surface-2)] px-1.5 py-0.5 text-[11px] text-[var(--ink-3)]">
                {items.length}
              </span>
            </div>
            <div className="flex min-h-[100px] flex-col gap-2">
              {items.map((app) => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  userId={userId}
                  onDragStart={() => setDraggedId(app.id)}
                  onDragEnd={() => setDraggedId(null)}
                  isDragging={draggedId === app.id}
                />
              ))}
              {items.length === 0 && (
                <div className="rounded-lg border border-dashed border-[var(--surface-3)] px-2 py-6 text-center text-[11px] text-[var(--ink-3)]">
                  Nothing here yet
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
