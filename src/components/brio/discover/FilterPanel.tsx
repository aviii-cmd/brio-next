import { Drawer } from "@/components/brio/Drawer";
import { Button } from "@/components/brio/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { useDistinctCountries } from "@/hooks/useDiscover";
import { cn } from "@/lib/utils";
import {
  OPPORTUNITY_CATEGORIES,
  type OpportunityDifficulty,
  type LocationType,
  type CostType,
  type CareerTrack,
  type PrestigeLevel,
} from "@/types/database";
import type { OpportunityFilters } from "@/services/discover";

const DIFFICULTIES: OpportunityDifficulty[] = ["Beginner", "Intermediate", "Advanced"];
const LOCATION_TYPES: LocationType[] = ["Remote", "Onsite", "Hybrid"];
const COST_TYPES: CostType[] = ["Free", "Stipend", "Paid", "Fee-required"];
const CAREER_TRACKS: CareerTrack[] = [
  "Founder",
  "Researcher",
  "Engineer",
  "Creative",
  "Analyst",
  "Leader",
  "Advocate",
];
const PRESTIGE_LEVELS: PrestigeLevel[] = ["School", "Regional", "National", "International"];
const DEADLINE_OPTIONS: { label: string; value: number | null }[] = [
  { label: "Any time", value: null },
  { label: "Within 7 days", value: 7 },
  { label: "Within 14 days", value: 14 },
  { label: "Within 30 days", value: 30 },
];

function toggleValue<T extends string>(list: T[] | undefined, value: T): T[] | undefined {
  const current = list ?? [];
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  return next.length ? next : undefined;
}

function FacetGroup<T extends string>({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: T[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className="mb-5">
      <p className="mb-2 text-[12px] font-medium text-[var(--ink-2)]">{label}</p>
      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <label
            key={opt}
            className="flex cursor-pointer items-center gap-2 text-[13px] text-[var(--ink)]"
          >
            <Checkbox checked={selected.includes(opt)} onCheckedChange={() => onToggle(opt)} />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

export function FilterPanel({
  open,
  onClose,
  filters,
  onChange,
  onClear,
  resultCount,
}: {
  open: boolean;
  onClose: () => void;
  filters: OpportunityFilters;
  onChange: (next: OpportunityFilters) => void;
  onClear: () => void;
  resultCount?: number;
}) {
  const { data: countries = [] } = useDistinctCountries();

  const activeCount =
    (filters.categories?.length ?? 0) +
    (filters.locationTypes?.length ?? 0) +
    (filters.countries?.length ?? 0) +
    (filters.costTypes?.length ?? 0) +
    (filters.difficulties?.length ?? 0) +
    (filters.careerTracks?.length ?? 0) +
    (filters.prestigeLevels?.length ?? 0) +
    (filters.maxDeadlineDays != null ? 1 : 0);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Filters"
      footer={
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={onClear} disabled={activeCount === 0}>
            Clear all {activeCount > 0 && `(${activeCount})`}
          </Button>
          <Button size="sm" onClick={onClose}>
            {resultCount != null ? `Show ${resultCount} results` : "Show results"}
          </Button>
        </div>
      }
    >
      <div className="mb-5">
        <p className="mb-2 text-[12px] font-medium text-[var(--ink-2)]">Deadline</p>
        <div className="flex flex-wrap gap-1.5">
          {DEADLINE_OPTIONS.map((d) => {
            const active = (filters.maxDeadlineDays ?? null) === d.value;
            return (
              <button
                key={d.label}
                type="button"
                onClick={() => onChange({ ...filters, maxDeadlineDays: d.value ?? undefined })}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[12px] transition-colors",
                  active
                    ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                    : "border-[var(--surface-3)] bg-white text-[var(--ink-2)] hover:bg-[var(--surface-2)]",
                )}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      <FacetGroup
        label="Category"
        options={OPPORTUNITY_CATEGORIES}
        selected={filters.categories ?? []}
        onToggle={(v) => onChange({ ...filters, categories: toggleValue(filters.categories, v) })}
      />
      <FacetGroup
        label="Location"
        options={LOCATION_TYPES}
        selected={filters.locationTypes ?? []}
        onToggle={(v) =>
          onChange({ ...filters, locationTypes: toggleValue(filters.locationTypes, v) })
        }
      />
      {countries.length > 0 && (
        <FacetGroup
          label="Country"
          options={countries}
          selected={filters.countries ?? []}
          onToggle={(v) => onChange({ ...filters, countries: toggleValue(filters.countries, v) })}
        />
      )}
      <FacetGroup
        label="Cost"
        options={COST_TYPES}
        selected={filters.costTypes ?? []}
        onToggle={(v) => onChange({ ...filters, costTypes: toggleValue(filters.costTypes, v) })}
      />
      <FacetGroup
        label="Difficulty"
        options={DIFFICULTIES}
        selected={filters.difficulties ?? []}
        onToggle={(v) =>
          onChange({ ...filters, difficulties: toggleValue(filters.difficulties, v) })
        }
      />
      <FacetGroup
        label="Career track"
        options={CAREER_TRACKS}
        selected={filters.careerTracks ?? []}
        onToggle={(v) =>
          onChange({ ...filters, careerTracks: toggleValue(filters.careerTracks, v) })
        }
      />
      <FacetGroup
        label="Prestige"
        options={PRESTIGE_LEVELS}
        selected={filters.prestigeLevels ?? []}
        onToggle={(v) =>
          onChange({ ...filters, prestigeLevels: toggleValue(filters.prestigeLevels, v) })
        }
      />
    </Drawer>
  );
}
