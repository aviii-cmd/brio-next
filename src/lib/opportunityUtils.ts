import type {
  Opportunity,
  Profile,
  ApplicationStatus,
  RecommendedOpportunity,
  AcademicLevel,
} from "@/types/database";

// ============================================================
// DEADLINES
// ============================================================
export function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export type DeadlineUrgency = "passed" | "urgent" | "soon" | "upcoming" | "rolling";

type DeadlineFields = Pick<Opportunity, "rolling_deadline" | "application_deadline">;

export function getDeadlineUrgency(opportunity: DeadlineFields): DeadlineUrgency {
  if (opportunity.rolling_deadline || !opportunity.application_deadline) return "rolling";
  const days = daysUntil(opportunity.application_deadline) ?? 0;
  if (days < 0) return "passed";
  if (days <= 3) return "urgent";
  if (days <= 14) return "soon";
  return "upcoming";
}

export function formatDeadline(opportunity: DeadlineFields): string {
  if (opportunity.rolling_deadline) return "Rolling deadline";
  if (!opportunity.application_deadline) return "No deadline listed";
  const days = daysUntil(opportunity.application_deadline) ?? 0;
  const dateLabel = new Date(opportunity.application_deadline).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (days < 0) return `Closed ${dateLabel}`;
  if (days === 0) return "Closes today";
  if (days === 1) return "Closes tomorrow";
  if (days <= 30) return `Closes in ${days} days`;
  return `Closes ${dateLabel}`;
}

// ============================================================
// ACADEMIC LEVEL <-> GRADE RANK (mirrors academic_level_rank() in SQL,
// used here purely for display so we don't need a round trip just to
// turn `eligibility_grade_min/max` back into a human label)
// ============================================================
export const ACADEMIC_LEVEL_RANK: Record<AcademicLevel, number> = {
  "Grade 9": 9,
  "Grade 10": 10,
  "Grade 11": 11,
  "Grade 12": 12,
  "Undergraduate Year 1": 13,
  "Undergraduate Year 2": 14,
  "Undergraduate Year 3": 15,
  "Undergraduate Year 4": 16,
  "Graduate / Postgraduate": 17,
};

const RANK_TO_LEVEL: Record<number, AcademicLevel> = Object.fromEntries(
  Object.entries(ACADEMIC_LEVEL_RANK).map(([level, rank]) => [rank, level as AcademicLevel]),
);

export function gradeRangeLabel(min: number | null, max: number | null): string {
  if (min == null && max == null) return "Open to all students";
  if (min != null && max != null && min === max) return RANK_TO_LEVEL[min] ?? "Varies";
  const minLabel = min != null ? RANK_TO_LEVEL[min] : null;
  const maxLabel = max != null ? RANK_TO_LEVEL[max] : null;
  if (minLabel && maxLabel) return `${minLabel} – ${maxLabel}`;
  if (minLabel) return `${minLabel} and above`;
  if (maxLabel) return `Up to ${maxLabel}`;
  return "Open to all students";
}

/** Is this opportunity's grade range compatible with the student's own level? Null = unknown, don't hard-block. */
export function isGradeEligible(
  opportunity: Pick<Opportunity, "eligibility_grade_min" | "eligibility_grade_max">,
  studentRank: number | null,
): boolean | null {
  if (studentRank == null) return null;
  if (opportunity.eligibility_grade_min != null && studentRank < opportunity.eligibility_grade_min)
    return false;
  if (opportunity.eligibility_grade_max != null && studentRank > opportunity.eligibility_grade_max)
    return false;
  return true;
}

// ============================================================
// "INELIGIBLE USER" NUDGE (PRD §10 edge case) — contextual prompts
// when missing profile data would silently narrow matches
// ============================================================
export function getProfileGapPrompts(
  profile: Pick<Profile, "academic_level" | "location">,
): string[] {
  const prompts: string[] = [];
  if (!profile.academic_level)
    prompts.push("Add your current grade or year to unlock grade-specific matches.");
  if (!profile.location?.trim())
    prompts.push("Add your location so we can match location-specific opportunities.");
  return prompts;
}

// ============================================================
// EXPLAINABILITY ("Because you added Python as a skill")
// ============================================================
function formatList(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function explainRecommendation(
  rec: Pick<RecommendedOpportunity, "matchedSkills" | "matchedTags" | "isExploration">,
): string {
  if (rec.isExploration) return "Outside your usual picks — a chance to explore something new.";
  const parts: string[] = [];
  if (rec.matchedSkills.length) {
    parts.push(
      `you added ${formatList(rec.matchedSkills)} as a skill${rec.matchedSkills.length > 1 ? "s" : ""}`,
    );
  }
  if (rec.matchedTags.length) {
    parts.push(`you're interested in ${formatList(rec.matchedTags)}`);
  }
  if (parts.length === 0) return "Matched to your profile and trending with similar students.";
  return `Because ${parts.join(" and ")}`;
}

// ============================================================
// TRACKER (Kanban): status labels + column grouping
// ============================================================
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  planning: "Planning",
  preparing: "Preparing",
  applied: "Applied",
  interview: "Interview",
  accepted: "Accepted",
  rejected: "Rejected",
  completed: "Completed",
};

export interface TrackerColumn {
  key: string;
  label: string;
  statuses: ApplicationStatus[];
}

// 6 visual columns per PRD §9, with Accepted/Rejected grouped into one
// "Decision" column (the DB still stores them as distinct statuses).
export const TRACKER_COLUMNS: TrackerColumn[] = [
  { key: "planning", label: "Planning", statuses: ["planning"] },
  { key: "preparing", label: "Preparing", statuses: ["preparing"] },
  { key: "applied", label: "Applied", statuses: ["applied"] },
  { key: "interview", label: "Interview", statuses: ["interview"] },
  { key: "decision", label: "Accepted / Rejected", statuses: ["accepted", "rejected"] },
  { key: "completed", label: "Completed", statuses: ["completed"] },
];

// ============================================================
// DEADLINE REMINDERS (multi-stage 14/7/3/1-day, PRD §9)
// ============================================================
export interface DeadlineReminder {
  applicationId: string;
  opportunityId: string;
  title: string;
  deadline: string;
  daysLeft: number;
  stage: 14 | 7 | 3 | 1;
}

const REMINDER_STAGES = [14, 7, 3, 1] as const;
// Once you've actually applied, a deadline reminder no longer helps —
// only pre-submission statuses get nudged.
const PRE_SUBMISSION_STATUSES: ApplicationStatus[] = ["planning", "preparing"];

type ReminderApplication = {
  id: string;
  status: ApplicationStatus;
  opportunity: Pick<Opportunity, "id" | "title" | "application_deadline" | "rolling_deadline">;
};

export function computeDeadlineReminders(applications: ReminderApplication[]): DeadlineReminder[] {
  const reminders: DeadlineReminder[] = [];
  for (const app of applications) {
    if (!PRE_SUBMISSION_STATUSES.includes(app.status)) continue;
    const { opportunity } = app;
    if (opportunity.rolling_deadline || !opportunity.application_deadline) continue;
    const days = daysUntil(opportunity.application_deadline);
    if (days == null || days < 0) continue;
    const stage = REMINDER_STAGES.find((s) => days <= s);
    if (!stage) continue;
    reminders.push({
      applicationId: app.id,
      opportunityId: opportunity.id,
      title: opportunity.title,
      deadline: opportunity.application_deadline,
      daysLeft: days,
      stage,
    });
  }
  return reminders.sort((a, b) => a.daysLeft - b.daysLeft);
}

// Milestone-based reminders for internal steps ("Get recommendation letter").
export interface ChecklistReminder {
  itemId: string;
  applicationId: string;
  opportunityTitle: string;
  title: string;
  dueDate: string;
  daysLeft: number;
}

type ReminderChecklistItem = {
  id: string;
  application_id: string;
  title: string;
  due_date: string | null;
  is_complete: boolean;
};

export function computeChecklistReminders(
  items: ReminderChecklistItem[],
  applications: { id: string; opportunity: Pick<Opportunity, "title"> }[],
): ChecklistReminder[] {
  const appById = new Map(applications.map((a) => [a.id, a]));
  const out: ChecklistReminder[] = [];
  for (const item of items) {
    if (item.is_complete || !item.due_date) continue;
    const days = daysUntil(item.due_date);
    if (days == null || days < 0 || days > 14) continue;
    const app = appById.get(item.application_id);
    if (!app) continue;
    out.push({
      itemId: item.id,
      applicationId: item.application_id,
      opportunityTitle: app.opportunity.title,
      title: item.title,
      dueDate: item.due_date,
      daysLeft: days,
    });
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

// ============================================================
// CALENDAR EXPORT ("System" calendar integration — PRD §11 Should-Have)
// A plain .ics download needs no OAuth/Google Calendar scope and works
// with any calendar app, so it covers the requirement without adding
// an external auth flow to Stage 3.
// ============================================================
function toICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeICSText(text: string): string {
  return text.replace(/([,;])/g, "\\$1");
}

export function generateDeadlineICS(
  opportunity: Pick<
    Opportunity,
    "id" | "title" | "organization" | "application_deadline" | "application_url"
  >,
): string | null {
  if (!opportunity.application_deadline) return null;
  const dt = new Date(opportunity.application_deadline);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Brio//Discover//EN",
    "BEGIN:VEVENT",
    `UID:${opportunity.id}@brio.app`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(dt)}`,
    `SUMMARY:${escapeICSText(`${opportunity.title} — Application Deadline`)}`,
    `DESCRIPTION:${escapeICSText(
      `${opportunity.organization}${opportunity.application_url ? " — " + opportunity.application_url : ""}`,
    )}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export function downloadICS(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
