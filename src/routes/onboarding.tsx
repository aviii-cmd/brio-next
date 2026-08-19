import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Button, FormField, Input, Textarea } from "@/components/brio/ui";
import { Briefcase, FlaskConical, GraduationCap, FolderHeart, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/brio/AuthGuard";
import { useOnboardingDraftAutosave, useOnboardingDraft } from "@/hooks/useData";
import { onboardingService } from "@/services/api";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Get started — Brio" }] }),
  component: OnboardingPageWrapper,
});

const intents = [
  { id: "internship", label: "Internship search", desc: "Finding your first or next internship", Icon: Briefcase },
  { id: "research", label: "Research opportunities", desc: "Undergraduate or graduate research roles", Icon: FlaskConical },
  { id: "university", label: "University applications", desc: "Applying to colleges or graduate programs", Icon: GraduationCap },
  { id: "portfolio", label: "Personal portfolio", desc: "Showcasing your work online", Icon: FolderHeart },
];

function OnboardingPageWrapper() {
  return (
    <AuthGuard>
      <OnboardingPage />
    </AuthGuard>
  );
}

function OnboardingPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { data: draft } = useOnboardingDraft(user?.id);
  const draftAutosave = useOnboardingDraftAutosave(user?.id);

  const [step, setStep] = useState(1);
  const [intent, setIntent] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [year, setYear] = useState("");
  const [goal, setGoal] = useState("");
  const [tab, setTab] = useState<"project" | "experience">("project");
  const [finishing, setFinishing] = useState(false);

  // Project fields
  const [projTitle, setProjTitle] = useState("");
  const [projProblem, setProjProblem] = useState("");
  const [projAction, setProjAction] = useState("");
  const [projResult, setProjResult] = useState("");

  // Experience fields
  const [expOrg, setExpOrg] = useState("");
  const [expRole, setExpRole] = useState("");
  const [expStart, setExpStart] = useState("");
  const [expEnd, setExpEnd] = useState("");
  const [expBullet, setExpBullet] = useState("");

  // If already completed onboarding, redirect
  useEffect(() => {
    if (profile?.onboarding_completed) {
      navigate({ to: "/dashboard" });
    }
  }, [profile, navigate]);

  // Restore draft — hydrate local state from the server exactly once, the
  // first time the query resolves (whether that's an existing draft or
  // `null` for a brand-new user). It must NOT re-run on every later change
  // to `draft`, because our own autosave writes also flow back through this
  // same query (via setQueryData in useSaveOnboardingDraft's onSuccess).
  // Re-running on those would periodically overwrite whatever the user is
  // actively typing with an older snapshot — that race was the cause of
  // letters appearing to drop out while typing on this page.
  const hydratedDraftRef = useRef(false);
  useEffect(() => {
    if (hydratedDraftRef.current || draft === undefined) return;
    hydratedDraftRef.current = true;
    if (!draft) return;
    if (draft.step) setStep(draft.step);
    if (draft.intent) setIntent(draft.intent);
    if (draft.name) setName(draft.name);
    if (draft.school) setSchool(draft.school);
    if (draft.graduation_year) setYear(draft.graduation_year);
    if (draft.goal) setGoal(draft.goal ?? "");
    if (draft.first_project && typeof draft.first_project === "object") {
      const p = draft.first_project as Record<string, string>;
      if (p.title) setProjTitle(p.title);
      if (p.problem) setProjProblem(p.problem);
      if (p.action) setProjAction(p.action);
      if (p.result) setProjResult(p.result);
    }
    if (draft.first_experience && typeof draft.first_experience === "object") {
      const e = draft.first_experience as Record<string, string>;
      if (e.org) setExpOrg(e.org);
      if (e.role) setExpRole(e.role);
      if (e.start_date) setExpStart(e.start_date);
      if (e.end_date) setExpEnd(e.end_date);
      if (e.bullets) setExpBullet(e.bullets);
    }
  }, [draft]);

  const persistDraft = (updates: object) => {
    if (!user?.id) return;
    draftAutosave.save({ ...updates });
  };

  const goToStep = (next: number) => {
    setStep(next);
    persistDraft({ step: next });
    // Step changes are deliberate checkpoints, not rapid typing — save them
    // (and anything else still pending) right away rather than waiting out
    // the debounce window.
    draftAutosave.flushNow();
  };

  const finish = async (skip = false) => {
    if (!user?.id) return;
    setFinishing(true);
    try {
      const firstProject =
        !skip && tab === "project" && projTitle
          ? { title: projTitle, problem: projProblem, action: projAction, result: projResult }
          : null;

      const firstExperience =
        !skip && tab === "experience" && expOrg
          ? { org: expOrg, role: expRole, start_date: expStart, end_date: expEnd, bullets: expBullet }
          : null;

      await onboardingService.complete(
        user.id,
        { name, school, graduation_year: year, goal, intent: intent ?? "" },
        firstProject,
        firstExperience,
      );
      await refreshProfile();
      navigate({ to: "/dashboard" });
    } catch {
      setFinishing(false);
    }
  };

  const labels = ["What brings you here?", "Tell us about yourself", "Add your first piece of work"];

  if (finishing) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <div className="max-w-[400px] text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-[var(--surface-3)]" />
          <div className="text-[20px] font-medium text-[var(--ink)]">{name || "Your name"}</div>
          <div className="mt-1 text-[13px] text-[var(--ink-3)]">{school || "Your school"}</div>
          <div className="mt-3 text-[13px] italic text-[var(--ink-2)]">{goal || "Your goal statement"}</div>
          <div className="mx-auto mt-6 max-w-[280px] rounded-md border border-[var(--surface-3)] bg-[var(--surface-2)] p-4 text-left">
            <div className="text-[11px] uppercase tracking-[0.04em] text-[var(--ink-3)]">
              {tab === "project" ? "Project" : "Experience"}
            </div>
            <div className="mt-1 h-2.5 w-32 rounded bg-[var(--surface-3)]" />
            <div className="mt-2 h-2 w-full rounded bg-[var(--surface-3)]" />
          </div>
          <p className="mt-8 text-[13px] text-[var(--ink-3)]">Building your profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[var(--surface)]">
      <div className="fixed inset-x-0 top-0 z-50">
        <div className="h-[3px] w-full bg-[var(--surface-3)]">
          <div
            className="h-full bg-[var(--ink)] transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
        <div className="bg-[var(--surface)] py-2 text-center text-[11px] text-[var(--ink-3)]">
          Step {step} of 3 — {labels[step - 1]}
        </div>
      </div>

      <div className="mx-auto max-w-[560px] px-4 pb-12 pt-28 sm:px-5 sm:pt-32">
        <div
          key={step}
          className="transition-all duration-[250ms] ease-out animate-in fade-in slide-in-from-right-4"
        >
          {step === 1 && (
            <>
              <h1 className="text-[28px] font-medium tracking-[-0.03em] text-[var(--ink)] sm:text-[36px]">
                What are you primarily using Brio for?
              </h1>
              <p className="mt-3 text-[15px] text-[var(--ink-2)]">
                We'll tailor your experience based on your answer.
              </p>
              <div className="mt-8 space-y-3">
                {intents.map((opt) => {
                  const active = intent === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setIntent(opt.id);
                        persistDraft({ intent: opt.id });
                      }}
                      className={`flex w-full items-center gap-4 rounded-md border p-4 text-left transition-all duration-150 min-h-[64px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:ring-offset-1 ${
                        active
                          ? "border-[var(--ink)] bg-[var(--surface-2)]"
                          : "border-[var(--surface-3)] bg-white hover:border-[var(--ink)] hover:bg-[var(--surface-2)]"
                      }`}
                    >
                      <opt.Icon className="h-5 w-5 text-[var(--ink-2)]" />
                      <div className="flex-1">
                        <div className="text-[15px] font-medium text-[var(--ink)]">{opt.label}</div>
                        <div className="text-[13px] text-[var(--ink-2)]">{opt.desc}</div>
                      </div>
                      {active && <Check className="h-5 w-5 text-[var(--ink)]" />}
                    </button>
                  );
                })}
              </div>
              <div className="mt-8 flex justify-end">
                <Button
                  variant="primary"
                  size="lg"
                  disabled={!intent}
                  onClick={() => goToStep(2)}
                >
                  Continue →
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-[28px] font-medium tracking-[-0.03em] text-[var(--ink)] sm:text-[36px]">
                Tell us about yourself
              </h1>
              <p className="mt-3 text-[15px] text-[var(--ink-2)]">
                This becomes the foundation of your profile.
              </p>
              <div className="mt-6 sm:mt-8">
                <FormField label="Full name" required>
                  <Input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      persistDraft({ name: e.target.value });
                    }}
                    placeholder="Your name as it appears on your resume"
                  />
                </FormField>
                <FormField label="Institution" required>
                  <Input
                    value={school}
                    onChange={(e) => {
                      setSchool(e.target.value);
                      persistDraft({ school: e.target.value });
                    }}
                    placeholder="University, college, or high school"
                  />
                </FormField>
                <FormField label="Graduation year" required>
                  <Input
                    value={year}
                    onChange={(e) => {
                      setYear(e.target.value);
                      persistDraft({ graduation_year: e.target.value });
                    }}
                    placeholder="Expected graduation year"
                  />
                </FormField>
                <FormField
                  label="Short goal statement"
                  helper="Keep it to one sentence. You can edit this anytime."
                >
                  <Textarea
                    value={goal}
                    onChange={(e) => {
                      setGoal(e.target.value);
                      persistDraft({ goal: e.target.value });
                    }}
                    placeholder='e.g., "Seeking a summer internship in product management at a consumer tech company."'
                    style={{ maxHeight: 88 }}
                  />
                </FormField>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Button variant="ghost" size="lg" onClick={() => goToStep(1)}>
                  ← Back
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  disabled={!name || !school || !year}
                  onClick={() => goToStep(3)}
                >
                  Continue →
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="text-[28px] font-medium tracking-[-0.03em] text-[var(--ink)] sm:text-[36px]">
                Let's add your first piece of work
              </h1>
              <p className="mt-3 text-[15px] text-[var(--ink-2)]">
                One project or experience gets you started. You can always add more.
              </p>

              <div className="mt-6 inline-flex rounded-full border border-[var(--surface-3)] bg-white p-1">
                {(["project", "experience"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`rounded-full px-4 py-2 text-[13px] capitalize transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)] ${
                      tab === t ? "bg-[var(--ink)] text-white" : "text-[var(--ink-2)]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="mt-6">
                {tab === "project" ? (
                  <>
                    <FormField label="Project title" required>
                      <Input
                        value={projTitle}
                        onChange={(e) => setProjTitle(e.target.value)}
                        placeholder="e.g., Campus Navigation App"
                      />
                    </FormField>
                    <FormField label="What problem did it solve?" required>
                      <Textarea
                        rows={2}
                        value={projProblem}
                        onChange={(e) => setProjProblem(e.target.value)}
                        placeholder="Describe the challenge or opportunity."
                      />
                    </FormField>
                    <FormField label="What did you do?" required>
                      <Textarea
                        rows={2}
                        value={projAction}
                        onChange={(e) => setProjAction(e.target.value)}
                        placeholder="Your specific contributions, in action verbs."
                      />
                    </FormField>
                    <FormField label="What was the result?" required>
                      <Textarea
                        rows={2}
                        value={projResult}
                        onChange={(e) => setProjResult(e.target.value)}
                        placeholder="The measurable outcome. Quantify where possible."
                      />
                    </FormField>
                  </>
                ) : (
                  <>
                    <FormField label="Organization" required>
                      <Input
                        value={expOrg}
                        onChange={(e) => setExpOrg(e.target.value)}
                        placeholder="Company, lab, or club name"
                      />
                    </FormField>
                    <FormField label="Your role" required>
                      <Input
                        value={expRole}
                        onChange={(e) => setExpRole(e.target.value)}
                        placeholder="e.g., Product Management Intern"
                      />
                    </FormField>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Start date">
                        <Input
                          type="month"
                          value={expStart}
                          onChange={(e) => setExpStart(e.target.value)}
                        />
                      </FormField>
                      <FormField label="End date">
                        <Input
                          type="month"
                          value={expEnd}
                          onChange={(e) => setExpEnd(e.target.value)}
                        />
                      </FormField>
                    </div>
                    <FormField label="What was your main contribution?">
                      <Textarea
                        rows={2}
                        value={expBullet}
                        onChange={(e) => setExpBullet(e.target.value)}
                        placeholder="One sentence on the impact you had."
                      />
                    </FormField>
                  </>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button variant="ghost" size="lg" onClick={() => goToStep(2)}>
                  ← Back
                </Button>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <button
                    onClick={() => finish(true)}
                    className="min-h-[44px] px-2 text-[13px] text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)] rounded-sm"
                  >
                    Skip for now
                  </button>
                  <Button variant="primary" size="lg" onClick={() => finish(false)}>
                    Add and go to my profile →
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
