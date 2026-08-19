import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { MoreHorizontal, GripVertical, Trash2, CheckSquare, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuPortal,
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
import { DeadlineBadge } from "./DeadlineBadge";
import { APPLICATION_STATUS_LABELS, TRACKER_COLUMNS } from "@/lib/opportunityUtils";
import { useUpdateApplicationStatus, useDeleteApplication } from "@/hooks/useDiscover";
import type { ApplicationWithOpportunity, ApplicationStatus } from "@/types/database";
import { cn } from "@/lib/utils";

export function ApplicationCard({
  application,
  userId,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  application: ApplicationWithOpportunity;
  userId: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const updateStatus = useUpdateApplicationStatus();
  const deleteApplication = useDeleteApplication();

  const checklistDone = application.checklist.filter((c) => c.is_complete).length;
  const checklistTotal = application.checklist.length;
  const allStatuses: ApplicationStatus[] = TRACKER_COLUMNS.flatMap((c) => c.statuses);

  return (
    <>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", application.id);
          e.dataTransfer.effectAllowed = "move";
          onDragStart?.();
        }}
        onDragEnd={onDragEnd}
        className={cn(
          "group rounded-lg border border-[var(--surface-3)] bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-opacity",
          isDragging && "opacity-40",
        )}
      >
        <div className="flex items-start gap-1.5">
          <GripVertical
            className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-grab text-[var(--ink-3)] opacity-0 group-hover:opacity-100"
            aria-hidden="true"
          />
          <Link
            to="/dashboard/discover/$opportunityId"
            params={{ opportunityId: application.opportunity_id }}
            className="min-w-0 flex-1"
          >
            <h4 className="line-clamp-2 text-[13px] font-medium leading-snug text-[var(--ink)] hover:underline">
              {application.opportunity.title}
            </h4>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Card actions"
                className="shrink-0 rounded p-0.5 text-[var(--ink-3)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Move to…</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {allStatuses
                      .filter((s) => s !== application.status)
                      .map((s) => (
                        <DropdownMenuItem
                          key={s}
                          onClick={() =>
                            updateStatus.mutate({ id: application.id, status: s, userId })
                          }
                        >
                          {APPLICATION_STATUS_LABELS[s]}
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setConfirmDelete(true)}
                className="text-[var(--error)] focus:text-[var(--error)]"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Remove from tracker
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="mt-1 line-clamp-1 pl-5 text-[12px] text-[var(--ink-2)]">
          {application.opportunity.organization}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-5">
          <DeadlineBadge opportunity={application.opportunity} />
        </div>

        {(checklistTotal > 0 || application.notes) && (
          <div className="mt-2 flex items-center gap-3 pl-5 text-[11px] text-[var(--ink-3)]">
            {checklistTotal > 0 && (
              <span className="inline-flex items-center gap-1">
                <CheckSquare className="h-3 w-3" />
                {checklistDone}/{checklistTotal}
              </span>
            )}
            {application.notes && (
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Notes
              </span>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove "{application.opportunity.title}" from your tracker?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes it from your Application Tracker. You can always save or apply to it
              again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteApplication.mutate({ id: application.id, userId })}
              className="bg-[var(--error)] hover:bg-[var(--error)]"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
