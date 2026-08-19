import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { PageHeader, EmptyState, Card } from "@/components/brio/ui";
import { GitCommitVertical, Folders, Briefcase, GraduationCap, Award } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProjects, useExperience, useEducation, useAchievements } from "@/hooks/useData";

export const Route = createFileRoute("/dashboard/timeline")({
  head: () => ({ meta: [{ title: "Timeline — Brio" }] }),
  component: TimelinePage,
});

type TimelineKind = "project" | "experience" | "education" | "achievement";

interface TimelineItem {
  id: string;
  kind: TimelineKind;
  title: string;
  subtitle: string;
  year: number;
  summary?: string;
}

const iconMap: Record<TimelineKind, React.ComponentType<{ className?: string }>> = {
  project: Folders,
  experience: Briefcase,
  education: GraduationCap,
  achievement: Award,
};

function TimelinePage() {
  const { user } = useAuth();
  const [yearFilter, setYearFilter] = useState<string>("All");

  const { data: projects = [] } = useProjects(user?.id);
  const { data: experience = [] } = useExperience(user?.id);
  const { data: education = [] } = useEducation(user?.id);
  const { data: achievements = [] } = useAchievements(user?.id);

  const timeline: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [
      ...projects.map((p) => ({
        id: p.id,
        kind: "project" as TimelineKind,
        title: p.title,
        subtitle: p.type,
        year: p.start_year ?? new Date(p.created_at).getFullYear(),
        summary: p.result,
      })),
      ...experience.map((e) => ({
        id: e.id,
        kind: "experience" as TimelineKind,
        title: e.role,
        subtitle: e.org,
        year: e.start_date
          ? parseInt(e.start_date.split("-")[0] ?? e.start_date, 10) || new Date(e.created_at).getFullYear()
          : new Date(e.created_at).getFullYear(),
        summary: e.bullets[0],
      })),
      ...education.map((e) => ({
        id: e.id,
        kind: "education" as TimelineKind,
        title: e.institution,
        subtitle: e.program,
        year: parseInt(e.start_year, 10) || new Date(e.created_at).getFullYear(),
      })),
      ...achievements.map((a) => ({
        id: a.id,
        kind: "achievement" as TimelineKind,
        title: a.name,
        subtitle: `${a.issuer} · ${a.level}`,
        year: a.year,
        summary: a.description ?? undefined,
      })),
    ];

    return items.sort((a, b) => b.year - a.year);
  }, [projects, experience, education, achievements]);

  const years = Array.from(new Set(timeline.map((t) => t.year))).sort((a, b) => b - a);
  const filtered = yearFilter === "All" ? timeline : timeline.filter((t) => String(t.year) === yearFilter);

  const grouped = filtered.reduce<Record<number, TimelineItem[]>>((acc, t) => {
    acc[t.year] = acc[t.year] ?? [];
    acc[t.year].push(t);
    return acc;
  }, {});

  const isEmpty = timeline.length === 0;

  return (
    <>
      <PageHeader
        title="Timeline"
        subtitle="Your professional story, chronologically."
        action={
          !isEmpty ? (
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="h-11 rounded-[4px] border border-[var(--surface-3)] bg-white px-3 text-[13px] text-[var(--ink)] focus:border-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[rgba(10,10,10,0.08)] transition-all"
            >
              <option value="All">All years</option>
              {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          ) : undefined
        }
      />

      {isEmpty ? (
        <Card className="border-dashed">
          <EmptyState
            icon={<GitCommitVertical className="h-6 w-6" />}
            title="Timeline is empty"
            body="As you add projects, experience, education, and achievements, they'll automatically appear here in chronological order."
          />
        </Card>
      ) : (
        <div className="relative pl-7 sm:pl-8">
          <div className="absolute left-2.5 sm:left-3 top-0 bottom-0 w-px bg-[var(--surface-3)]" />
          {Object.entries(grouped)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([year, items]) => (
              <div key={year} className="mb-8">
                <div className="mb-4 text-[24px] font-light text-[var(--ink-3)]">{year}</div>
                <div className="space-y-3">
                  {items.map((t) => {
                    const Icon = iconMap[t.kind];
                    return (
                      <div key={t.id} className="relative">
                        <span className="absolute -left-[18px] sm:-left-[22px] top-3 h-2.5 w-2.5 rounded-full bg-[var(--ink)] ring-2 ring-[var(--surface)]" />
                        <div className="rounded-md border border-[var(--surface-3)] bg-white p-4 transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                          <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--ink)]">
                            <Icon className="h-3.5 w-3.5 text-[var(--ink-3)]" />
                            {t.title}
                          </div>
                          <div className="mt-0.5 text-[11px] uppercase tracking-[0.02em] text-[var(--ink-3)]">
                            {t.subtitle}
                          </div>
                          {t.summary && (
                            <p className="mt-2 line-clamp-2 text-[13px] text-[var(--ink-2)]">{t.summary}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </>
  );
}
