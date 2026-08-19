import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export function OpportunityRail({
  title,
  subtitle,
  icon,
  seeAllTo,
  isLoading,
  isEmpty,
  emptyMessage,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  seeAllTo?: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
}) {
  if (isEmpty && !emptyMessage) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h2 className="text-[15px] font-medium text-[var(--ink)]">{title}</h2>
            {subtitle && <p className="text-[12px] text-[var(--ink-3)]">{subtitle}</p>}
          </div>
        </div>
        {seeAllTo && !isEmpty && (
          <Link
            to={seeAllTo}
            className="flex shrink-0 items-center gap-0.5 text-[12px] font-medium text-[var(--ink-2)] hover:text-[var(--ink)]"
          >
            See all
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-x-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="brio-skeleton h-[200px] w-[260px] shrink-0 rounded-lg" />
          ))}
        </div>
      ) : isEmpty ? (
        <p className="rounded-lg border border-dashed border-[var(--surface-3)] px-4 py-6 text-center text-[13px] text-[var(--ink-3)]">
          {emptyMessage}
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">{children}</div>
      )}
    </section>
  );
}
