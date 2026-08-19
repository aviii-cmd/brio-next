import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, EmptyState, Button, PageHeader, FormField, Input } from "@/components/brio/ui";
import { Sparkles, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSkills, useUpsertSkill, useDeleteSkill } from "@/hooks/useData";
import type { Skill, SkillCategory } from "@/types/database";

export const Route = createFileRoute("/dashboard/skills")({
  head: () => ({ meta: [{ title: "Skills — Brio" }] }),
  component: SkillsPage,
});

const CATEGORIES: SkillCategory[] = ["Technical", "Tools", "Soft"];

function SkillsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const { data: skills = [], isLoading } = useSkills(user?.id);
  const upsertSkill = useUpsertSkill();
  const deleteSkill = useDeleteSkill();

  const [open, setOpen] = useState<SkillCategory | null>(null);
  const [skillInput, setSkillInput] = useState("");
  const [activePopover, setActivePopover] = useState<string | null>(null);

  const byCategory = (cat: SkillCategory) => skills.filter((s) => s.category === cat);

  const addSkill = (category: SkillCategory) => {
    const name = skillInput.trim();
    if (!name) return;
    upsertSkill.mutate({ userId, skill: { name, category, source: "manual", linked_to: [] } });
    setSkillInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, category: SkillCategory) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill(category);
    }
  };

  const total = skills.length;

  if (isLoading) {
    return (
      <>
        <PageHeader title="Skills" />
        <div className="h-48 rounded-lg brio-skeleton" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Skills"
        subtitle="Skills are linked to your projects and experiences as evidence."
      />

      {total === 0 ? (
        <Card className="border-dashed">
          <EmptyState
            icon={<Sparkles className="h-6 w-6" />}
            title="No skills yet"
            body="Skills can be added manually here, or automatically when you link them to a project. Skills with evidence carry more weight."
            cta={
              <div className="flex gap-2">
                <Button variant="primary" onClick={() => setOpen("Technical")}>
                  <Plus className="h-4 w-4" />
                  Add a skill
                </Button>
                <Link to="/dashboard/projects">
                  <Button variant="secondary">Go to Projects</Button>
                </Link>
              </div>
            }
          />
        </Card>
      ) : (
        <Card className="space-y-7 bg-white">
          {CATEGORIES.map((cat) => {
            const catSkills = byCategory(cat);
            const label =
              cat === "Tools"
                ? "Tools & Technologies"
                : cat === "Soft"
                  ? "Soft Skills"
                  : "Technical Skills";
            return (
              <div key={cat}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--ink-3)]">
                    {label}
                  </div>
                  <button
                    onClick={() => {
                      setOpen(open === cat ? null : cat);
                      setSkillInput("");
                    }}
                    className="flex items-center gap-1 text-[11px] text-[var(--accent-warm)] hover:text-[var(--ink)]"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                </div>

                {open === cat && (
                  <div className="mb-3 flex gap-2">
                    <Input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, cat)}
                      placeholder={`Add a ${cat.toLowerCase()} skill…`}
                      autoFocus
                    />
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => addSkill(cat)}
                      disabled={!skillInput.trim() || upsertSkill.isPending}
                    >
                      Add
                    </Button>
                    <Button variant="ghost" size="md" onClick={() => setOpen(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {catSkills.length === 0 ? (
                  <p className="text-[13px] text-[var(--ink-3)]">
                    No {label.toLowerCase()} added yet.{" "}
                    <button
                      onClick={() => setOpen(cat)}
                      className="text-[var(--accent-warm)] hover:underline"
                    >
                      Add one →
                    </button>
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {catSkills.map((s) => (
                      <SkillChip
                        key={s.id}
                        skill={s}
                        isOpen={activePopover === s.id}
                        onToggle={() => setActivePopover(activePopover === s.id ? null : s.id)}
                        onDelete={() => {
                          deleteSkill.mutate({ id: s.id, userId });
                          setActivePopover(null);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="border-t border-[var(--surface-3)] pt-4 text-[11px] text-[var(--ink-3)]">
            Skill prominence reflects how often it appears across your profile. Skills derived from
            projects show the evidence behind your claims.
          </div>
        </Card>
      )}
    </>
  );
}

function SkillChip({
  skill,
  isOpen,
  onToggle,
  onDelete,
}: {
  skill: Skill;
  isOpen: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const prominent = skill.linked_to.length >= 2;

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--surface-3)] bg-[var(--surface-2)] px-3 py-1 text-[13px] ${
          prominent ? "text-[var(--ink)] font-medium" : "text-[var(--ink-2)]"
        }`}
      >
        {skill.name}
        {(skill.source === "project" || skill.source === "opportunity") && (
          <span
            className="h-1.5 w-1.5 rounded-full bg-[var(--accent-warm)]"
            title={
              skill.source === "opportunity"
                ? "Earned via a completed Discover opportunity"
                : "Linked to a project"
            }
          />
        )}
      </button>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-56 rounded-md border border-[var(--surface-3)] bg-white p-3 shadow-md">
          {skill.linked_to.length > 0 ? (
            <>
              <div className="text-[11px] uppercase tracking-[0.04em] text-[var(--ink-3)]">
                Derived from
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {skill.linked_to.map((l) => (
                  <span
                    key={l}
                    className="rounded bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--ink-2)]"
                  >
                    {l}
                  </span>
                ))}
              </div>
              <div className="mt-2 h-px bg-[var(--surface-3)]" />
            </>
          ) : (
            <div className="mb-2 text-[11px] text-[var(--ink-3)]">Manually added skill</div>
          )}
          <button
            onClick={onDelete}
            className="mt-1 flex w-full items-center gap-1.5 rounded px-1 py-1 text-[11px] text-[var(--error)] hover:bg-[rgba(192,57,43,0.06)]"
          >
            <Trash2 className="h-3 w-3" />
            Remove skill
          </button>
        </div>
      )}
    </div>
  );
}
