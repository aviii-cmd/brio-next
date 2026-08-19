import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button, Input, PageHeader, Toggle, EmptyState, Card } from "@/components/brio/ui";
import { FileText, LayoutGrid, AlignLeft, Download } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  useProfile,
  useProjects,
  useExperience,
  useEducation,
  useAchievements,
  useSkills,
  useProfileCounts,
} from "@/hooks/useData";

export const Route = createFileRoute("/dashboard/output")({
  head: () => ({ meta: [{ title: "Output — Brio" }] }),
  component: OutputPage,
});

const templates = [
  { id: "resume", label: "Resume — One Page", Icon: FileText },
  { id: "portfolio", label: "Portfolio View", Icon: LayoutGrid },
  { id: "snippets", label: "Application Snippets", Icon: AlignLeft },
];

function OutputPage() {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: profile } = useProfile(userId);
  const { data: projects = [] } = useProjects(userId);
  const { data: experience = [] } = useExperience(userId);
  const { data: education = [] } = useEducation(userId);
  const { data: achievements = [] } = useAchievements(userId);
  const { data: skills = [] } = useSkills(userId);
  const counts = useProfileCounts(userId);

  const [template, setTemplate] = useState("resume");
  const [target, setTarget] = useState("");
  const [toggles, setToggles] = useState({
    projects: true,
    experience: true,
    education: true,
    achievements: true,
  });
  const [generating, setGenerating] = useState(false);

  const hasContent =
    counts.projects + counts.experience + counts.education + counts.achievements > 0;

  const generate = () => {
    if (!hasContent) {
      toast.error("Add some content to your profile before exporting.");
      return;
    }
    setGenerating(true);
    // Architecture supports future PDF generation via server function
    setTimeout(() => {
      setGenerating(false);
      toast.success(
        "Export ready — PDF generation coming soon. Copy the shareable URL to share now.",
      );
    }, 1200);
  };

  const copyShareUrl = () => {
    const url = `${window.location.origin}/profile/${user?.id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Shareable URL copied to clipboard");
    });
  };

  const exportJson = () => {
    const data = {
      profile,
      projects: toggles.projects ? projects : [],
      experience: toggles.experience ? experience : [],
      education: toggles.education ? education : [],
      achievements: toggles.achievements ? achievements : [],
      skills,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brio-profile-${profile?.name?.replace(/\s+/g, "-").toLowerCase() ?? "export"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON export downloaded");
  };

  return (
    <>
      <PageHeader title="Output" subtitle="Generate tailored exports from your profile." />

      {!hasContent ? (
        <Card className="border-dashed">
          <EmptyState
            icon={<Download className="h-6 w-6" />}
            title="Nothing to export yet"
            body="Add projects, experience, or education to your profile first. Then come back here to generate a resume or export your data."
          />
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
          {/* Left panel: controls */}
          <div className="space-y-6">
            <div>
              <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--ink-3)]">
                Choose a format
              </div>
              <div className="space-y-2">
                {templates.map((t) => {
                  const active = template === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTemplate(t.id)}
                      className={`flex w-full items-center gap-3 rounded-md border p-4 text-left text-[13px] transition-colors ${
                        active
                          ? "border-[var(--ink)] bg-[var(--surface-2)] font-medium"
                          : "border-[var(--surface-3)] bg-white text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
                      }`}
                    >
                      <t.Icon className="h-4 w-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--ink-3)]">
                Include in export
              </div>
              <div className="space-y-3 rounded-md border border-[var(--surface-3)] bg-white p-4">
                {(
                  [
                    ["projects", `Projects (${counts.projects})`],
                    ["experience", `Experience (${counts.experience})`],
                    ["education", `Education (${counts.education})`],
                    ["achievements", `Achievements (${counts.achievements})`],
                  ] as const
                ).map(([k, l], i) => (
                  <div
                    key={k}
                    className={`flex items-center justify-between text-[13px] text-[var(--ink)] ${i > 0 ? "border-t border-[var(--surface-3)] pt-3" : ""}`}
                  >
                    <span>{l}</span>
                    <Toggle
                      checked={toggles[k]}
                      onChange={(v) => setToggles({ ...toggles, [k]: v })}
                    />
                  </div>
                ))}
                <div
                  className="flex items-center justify-between border-t border-[var(--surface-3)] pt-3 text-[13px] text-[var(--ink-3)]"
                  title="Skills are always included"
                >
                  <span>Skills (always included)</span>
                  <Toggle checked={true} onChange={() => {}} disabled />
                </div>
              </div>
            </div>

            {template === "resume" && (
              <div>
                <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--ink-3)]">
                  Tailored for
                </div>
                <Input
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="e.g., PM Internship at Stripe"
                />
                <p className="mt-1 text-[11px] text-[var(--ink-3)]">
                  Optional. Helps prioritise relevant entries.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Button variant="secondary" size="md" className="w-full" onClick={exportJson}>
                Export as JSON
              </Button>
            </div>
          </div>

          {/* Right panel: preview */}
          <div>
            <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--ink-3)]">
              Preview
            </div>
            <div className="max-h-[50vh] overflow-y-auto rounded-md border border-[var(--surface-3)] bg-white p-4 sm:p-6 xl:max-h-[640px]">
              <div className="font-serif text-[20px] font-semibold text-[var(--ink)]">
                {profile?.name || "Your Name"}
              </div>
              <div className="text-[13px] text-[var(--ink-3)]">
                {[
                  profile?.school,
                  profile?.graduation_year ? `Class of ${profile.graduation_year}` : null,
                  profile?.location,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              {profile?.goal && (
                <p className="mt-3 text-[13px] italic text-[var(--ink-2)]">{profile.goal}</p>
              )}

              {toggles.experience && experience.length > 0 && (
                <PreviewSection label="Experience">
                  {experience.map((e) => (
                    <div key={e.id} className="mb-3">
                      <div className="flex justify-between text-[13px] text-[var(--ink)]">
                        <span className="font-medium">
                          {e.role} · {e.org}
                        </span>
                        <span className="text-[var(--ink-3)]">
                          {e.start_date}–{e.is_current ? "Present" : e.end_date}
                        </span>
                      </div>
                      {e.bullets.map((b, i) => (
                        <div key={i} className="text-[12px] text-[var(--ink-2)]">
                          – {b}
                        </div>
                      ))}
                    </div>
                  ))}
                </PreviewSection>
              )}

              {toggles.projects && projects.length > 0 && (
                <PreviewSection label="Projects">
                  {projects.map((p) => (
                    <div key={p.id} className="mb-3">
                      <div className="text-[13px] font-medium text-[var(--ink)]">{p.title}</div>
                      <div className="text-[12px] text-[var(--ink-2)]">{p.result}</div>
                      {p.skills.length > 0 && (
                        <div className="mt-1 text-[11px] text-[var(--ink-3)]">
                          {p.skills.join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </PreviewSection>
              )}

              {toggles.education && education.length > 0 && (
                <PreviewSection label="Education">
                  {education.map((e) => (
                    <div key={e.id} className="text-[13px]">
                      <span className="font-medium text-[var(--ink)]">{e.institution}</span>
                      {" — "}
                      <span className="text-[var(--ink-2)]">
                        {e.program}
                        {e.end_year ? `, ${e.end_year}` : ""}
                        {e.gpa ? ` · GPA ${e.gpa}` : ""}
                      </span>
                    </div>
                  ))}
                </PreviewSection>
              )}

              {toggles.achievements && achievements.length > 0 && (
                <PreviewSection label="Achievements">
                  {achievements.map((a) => (
                    <div key={a.id} className="text-[13px] text-[var(--ink-2)]">
                      {a.name} — {a.issuer} ({a.year}, {a.level})
                    </div>
                  ))}
                </PreviewSection>
              )}

              {skills.length > 0 && (
                <PreviewSection label="Skills">
                  <div className="text-[13px] text-[var(--ink-2)]">
                    {skills.map((s) => s.name).join(", ")}
                  </div>
                </PreviewSection>
              )}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
                onClick={copyShareUrl}
              >
                Copy shareable URL
              </Button>
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto"
                onClick={generate}
                loading={generating}
              >
                Generate PDF
              </Button>
            </div>
            <p className="mt-2 text-right text-[11px] text-[var(--ink-3)]">
              PDF generation is in development. Export as JSON for now, or copy your shareable URL.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function PreviewSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="mb-2 border-b border-[var(--surface-3)] pb-1 text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--ink)]">
        {label}
      </div>
      {children}
    </div>
  );
}
