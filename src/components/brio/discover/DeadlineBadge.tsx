import { Clock, Infinity as InfinityIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDeadline, getDeadlineUrgency, type DeadlineUrgency } from "@/lib/opportunityUtils";
import type { Opportunity } from "@/types/database";

const STYLES: Record<DeadlineUrgency, string> = {
  urgent: "text-[var(--error)] border-[rgba(192,57,43,0.24)]",
  soon: "text-[var(--accent-warm)] border-[rgba(200,98,42,0.24)]",
  upcoming: "text-[var(--ink-2)] border-[var(--surface-3)]",
  rolling: "text-[var(--ink-3)] border-[var(--surface-3)]",
  passed: "text-[var(--ink-3)] border-[var(--surface-3)] line-through decoration-[var(--ink-3)]",
};

const BG: Record<DeadlineUrgency, React.CSSProperties | undefined> = {
  urgent: { backgroundColor: "rgba(192,57,43,0.08)" },
  soon: { backgroundColor: "rgba(200,98,42,0.08)" },
  upcoming: undefined,
  rolling: undefined,
  passed: undefined,
};

export function DeadlineBadge({
  opportunity,
  className,
}: {
  opportunity: Pick<Opportunity, "rolling_deadline" | "application_deadline">;
  className?: string;
}) {
  const urgency = getDeadlineUrgency(opportunity);
  const label = formatDeadline(opportunity);
  const Icon = opportunity.rolling_deadline ? InfinityIcon : Clock;
  return (
    <span
      style={BG[urgency]}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] tracking-[0.02em] whitespace-nowrap",
        urgency === "upcoming" || urgency === "rolling" || urgency === "passed"
          ? "bg-[var(--surface-2)]"
          : undefined,
        STYLES[urgency],
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}
