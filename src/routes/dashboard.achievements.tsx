import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader, FormField, Input, Textarea, EmptyState } from "@/components/brio/ui";
import { Drawer } from "@/components/brio/Drawer";
import { MoreHorizontal, Plus, Award, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useAchievements,
  useCreateAchievement,
  useUpdateAchievement,
  useDeleteAchievement,
} from "@/hooks/useData";
import type { Achievement } from "@/types/database";
import { achievementSchema, type AchievementFormValues } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

export const Route = createFileRoute("/dashboard/achievements")({
  head: () => ({ meta: [{ title: "Achievements — Brio" }] }),
  component: AchievementsPage,
});

const levelVariants: Record<string, "level-school" | "level-regional" | "level-national" | "level-international"> = {
  School: "level-school",
  Regional: "level-regional",
  National: "level-national",
  International: "level-international",
};

function AchievementsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const { data: achievements = [], isLoading } = useAchievements(user?.id);
  const createAchievement = useCreateAchievement();
  const updateAchievement = useUpdateAchievement();
  const deleteAchievement = useDeleteAchievement();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Achievement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const onAdd = () => { setEditing(null); setOpen(true); };
  const onEdit = (a: Achievement) => { setEditing(a); setOpen(true); };

  const handleSave = (values: AchievementFormValues) => {
    if (editing) {
      updateAchievement.mutate({ id: editing.id, updates: values, userId });
    } else {
      createAchievement.mutate({ ...values, user_id: userId });
    }
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteAchievement.mutate({ id, userId });
    setConfirmDelete(null);
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Achievements" action={<Button variant="primary" onClick={onAdd}><Plus className="h-4 w-4" />Add achievement</Button>} />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => <div key={i} className="h-36 rounded-lg brio-skeleton" />)}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Achievements"
        subtitle="Awards, honours, and recognitions — ranked by impact level."
        action={<Button variant="primary" onClick={onAdd}><Plus className="h-4 w-4" />Add achievement</Button>}
      />

      {achievements.length === 0 ? (
        <Card className="border-dashed">
          <EmptyState
            icon={<Award className="h-6 w-6" />}
            title="No achievements yet"
            body="Achievements show the recognition you've earned — from Dean's List to hackathon wins. Level signals (School → International) matter to reviewers."
            cta={
              <Button variant="primary" onClick={onAdd}>
                <Plus className="h-4 w-4" />Add your first achievement
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {achievements.map((a) => (
            <Card key={a.id} hover className="bg-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-[15px] font-medium text-[var(--ink)]">{a.name}</div>
                  <div className="mt-0.5 text-[13px] text-[var(--ink-2)]">{a.issuer}</div>
                  <div className="mt-1 text-[11px] text-[var(--ink-3)]">{a.year}</div>
                  {a.description && (
                    <p className="mt-3 text-[13px] text-[var(--ink-2)]">{a.description}</p>
                  )}
                  <div className="mt-3">
                    <Badge variant={levelVariants[a.level] ?? "level-school"}>{a.level}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    aria-label="Delete achievement"
                    onClick={() => setConfirmDelete(a.id)}
                    className="p-1 text-[var(--ink-3)] hover:text-[var(--error)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    aria-label="Edit achievement"
                    onClick={() => onEdit(a)}
                    className="p-1 text-[var(--ink-3)] hover:text-[var(--ink)]"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AchievementDrawer
        open={open}
        onClose={() => setOpen(false)}
        achievement={editing}
        onSave={handleSave}
      />

      {confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-5">
          <div className="w-full max-w-[400px] rounded-lg bg-white p-8" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.10)" }}>
            <h2 className="text-[18px] font-medium text-[var(--ink)]">Delete achievement?</h2>
            <p className="mt-2 text-[13px] text-[var(--ink-2)]">This cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => handleDelete(confirmDelete)}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AchievementDrawer({
  open, onClose, achievement, onSave,
}: {
  open: boolean;
  onClose: () => void;
  achievement: Achievement | null;
  onSave: (v: AchievementFormValues) => void;
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AchievementFormValues>({
    resolver: zodResolver(achievementSchema),
    defaultValues: { name: "", issuer: "", year: new Date().getFullYear(), level: "School", description: null },
  });

  useEffect(() => {
    if (!open) return;
    if (achievement) {
      reset({
        name: achievement.name,
        issuer: achievement.issuer,
        year: achievement.year,
        level: achievement.level,
        description: achievement.description,
      });
    } else {
      reset({ name: "", issuer: "", year: new Date().getFullYear(), level: "School", description: null });
    }
  }, [achievement, open, reset]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={achievement ? "Edit achievement" : "New achievement"}
      footer={
        <Button variant="primary" size="lg" className="w-full" onClick={handleSubmit(onSave)}>
          {achievement ? "Save changes" : "Add achievement"}
        </Button>
      }
    >
      <FormField label="Achievement name" required error={errors.name?.message}>
        <Input {...register("name")} placeholder="e.g., Dean's List" error={!!errors.name} />
      </FormField>
      <FormField label="Issuing organization" required error={errors.issuer?.message}>
        <Input {...register("issuer")} placeholder="e.g., UC Berkeley EECS" error={!!errors.issuer} />
      </FormField>
      <FormField label="Year" required error={errors.year?.message}>
        <Input
          type="number"
          {...register("year", { valueAsNumber: true })}
          placeholder={String(new Date().getFullYear())}
          error={!!errors.year}
        />
      </FormField>
      <FormField label="Level" required>
        <select
          {...register("level")}
          className="h-9 w-full rounded-[4px] border border-[var(--surface-3)] bg-white px-3 text-[15px] text-[var(--ink)] outline-none focus:border-[var(--ink)]"
        >
          {["School", "Regional", "National", "International"].map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </FormField>
      <div className="mb-4 rounded-md bg-[var(--surface-2)] px-3 py-2 text-[11px] text-[var(--ink-3)]">
        Level signals matter — International and National achievements carry the most weight.
      </div>
      <FormField label="Description" error={errors.description?.message}>
        <Textarea
          {...register("description")}
          placeholder="Brief context — how selective, what it recognises."
        />
      </FormField>
    </Drawer>
  );
}
