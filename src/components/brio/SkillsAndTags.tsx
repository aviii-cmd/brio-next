import * as React from "react";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/brio/ui";
import { TagChip } from "@/components/brio/ProjectsUI";
import {
  useTags,
  useProjectTags,
  useAddProjectTag,
  useRemoveProjectTag,
} from "@/hooks/useProjectWorkspace";
import type { TagType } from "@/types/database";
import { cn } from "@/lib/utils";

/**
 * Skills & Technologies (PRD §5.2) — the structured list pulled into
 * Brio's Skills module, plus typed Tech/Domain tags used for faceted
 * filtering on Projects Home (PRD §5.3) without polluting the Skills
 * module itself.
 */
export function SkillsAndTechnologies({
  skills,
  onChange,
}: {
  skills: string[];
  onChange: (skills: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const addSkill = () => {
    const trimmed = draft.trim();
    if (!trimmed || skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...skills, trimmed]);
    setDraft("");
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {skills.map((s) => (
          <TagChip key={s} label={s} onRemove={() => onChange(skills.filter((x) => x !== s))} />
        ))}
      </div>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addSkill();
          }
        }}
        onBlur={addSkill}
        placeholder="Add a skill or technology and press Enter (e.g. React, Figma, SQL)"
      />
      <p className="mt-1.5 text-[11px] text-[var(--ink-3)]">
        These feed directly into your Skills module and show reviewers what you actually used.
      </p>
    </div>
  );
}

const TAG_TYPES: { value: TagType; label: string }[] = [
  { value: "tech", label: "Technology tags" },
  { value: "domain", label: "Domain tags" },
];

/**
 * Typed tag picker (Technology / Domain) used purely for filtering and
 * discovery on Projects Home — kept separate from the Skills module so
 * broad domain labels ("Healthcare", "EdTech") don't clutter it.
 */
export function TypedTagPicker({ projectId, userId }: { projectId: string; userId: string }) {
  const { data: allTags = [] } = useTags(userId);
  const { data: projectTags = [] } = useProjectTags(projectId);
  const addTag = useAddProjectTag();
  const removeTag = useRemoveProjectTag();

  return (
    <div className="space-y-4">
      {TAG_TYPES.map(({ value, label }) => (
        <TagTypeRow
          key={value}
          type={value}
          label={label}
          selected={projectTags.filter((t) => t.type === value)}
          suggestions={allTags.filter((t) => t.type === value)}
          onAdd={(name) => addTag.mutate({ userId, projectId, name, type: value })}
          onRemove={(tagId) => removeTag.mutate({ projectId, tagId })}
        />
      ))}
    </div>
  );
}

function TagTypeRow({
  type,
  label,
  selected,
  suggestions,
  onAdd,
  onRemove,
}: {
  type: TagType;
  label: string;
  selected: { id: string; name: string }[];
  suggestions: { id: string; name: string }[];
  onAdd: (name: string) => void;
  onRemove: (tagId: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);

  const filteredSuggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    const selectedNames = new Set(selected.map((s) => s.name.toLowerCase()));
    return suggestions
      .filter((s) => !selectedNames.has(s.name.toLowerCase()))
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [suggestions, selected, draft]);

  const commit = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setDraft("");
  };

  return (
    <div>
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--ink-3)]">
        {label}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map((t) => (
          <TagChip key={t.id} label={t.name} type={type} onRemove={() => onRemove(t.id)} />
        ))}
        <div className="relative">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 120)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit(draft);
              }
            }}
            placeholder={`+ Add ${type} tag`}
            className="h-6 w-36 rounded-full border border-dashed border-[var(--surface-3)] bg-transparent px-2.5 text-[11px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-3)] focus:border-[var(--ink)]"
          />
          {focused && filteredSuggestions.length > 0 && (
            <div className="absolute left-0 top-7 z-10 w-44 overflow-hidden rounded-md border border-[var(--surface-3)] bg-white py-1 shadow-lg">
              {filteredSuggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(s.name);
                  }}
                  className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[12px] text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
                >
                  <Plus className="h-3 w-3 text-[var(--ink-3)]" />
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
