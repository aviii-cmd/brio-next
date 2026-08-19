import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  PageHeader,
  FormField,
  Input,
  Textarea,
  EmptyState,
} from "@/components/brio/ui";
import { Drawer } from "@/components/brio/Drawer";
import { MoreHorizontal, Plus, Briefcase, Trash2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useExperience,
  useCreateExperience,
  useUpdateExperience,
  useDeleteExperience,
} from "@/hooks/useData";
import type { Experience } from "@/types/database";
import { experienceSchema, type ExperienceFormValues } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

export const Route = createFileRoute("/dashboard/experience")({
  head: () => ({ meta: [{ title: "Experience — Brio" }] }),
  component: ExperiencePage,
});

function ExperiencePage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const { data: experience = [], isLoading } = useExperience(user?.id);
  const createExperience = useCreateExperience();
  const updateExperience = useUpdateExperience();
  const deleteExperience = useDeleteExperience();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Experience | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const onAdd = () => {
    setEditing(null);
    setOpen(true);
  };
  const onEdit = (e: Experience) => {
    setEditing(e);
    setOpen(true);
  };

  const handleSave = (values: ExperienceFormValues) => {
    if (editing) {
      updateExperience.mutate({ id: editing.id, updates: values, userId });
    } else {
      createExperience.mutate({ ...values, user_id: userId });
    }
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteExperience.mutate({ id, userId });
    setConfirmDelete(null);
  };

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Experience"
          action={
            <Button variant="primary" onClick={onAdd}>
              <Plus className="h-4 w-4" />
              Add experience
            </Button>
          }
        />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-36 rounded-lg brio-skeleton" />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Experience"
        subtitle="Internships, part-time roles, research, volunteering, and clubs."
        action={
          <Button variant="primary" onClick={onAdd}>
            <Plus className="h-4 w-4" />
            Add experience
          </Button>
        }
      />

      {experience.length === 0 ? (
        <Card className="border-dashed">
          <EmptyState
            icon={<Briefcase className="h-6 w-6" />}
            title="No experience yet"
            body="Add internships, part-time roles, research positions, volunteer work, or leadership in clubs. Every role tells a recruiter something about you."
            cta={
              <Button variant="primary" onClick={onAdd}>
                <Plus className="h-4 w-4" />
                Add your first experience
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {experience.map((e) => (
            <Card key={e.id} hover className="bg-white border-l-2 border-l-[var(--surface-3)]">
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="flex flex-col items-center pt-1 shrink-0">
                  <div className="text-[11px] text-[var(--ink-3)]">
                    {e.start_date ? e.start_date.split("-")[0] || e.start_date : ""}
                  </div>
                  <div className="my-1 h-8 w-px bg-[var(--surface-3)]" />
                  <div className="text-[11px] text-[var(--ink-3)]">
                    {e.is_current
                      ? "Now"
                      : e.end_date
                        ? e.end_date.split("-")[0] || e.end_date
                        : ""}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[15px] font-medium text-[var(--ink)]">{e.org}</div>
                      <div className="text-[13px] text-[var(--ink-2)]">{e.role}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge>{e.type}</Badge>
                        {e.location && (
                          <span className="text-[11px] text-[var(--ink-3)]">{e.location}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        aria-label="Delete experience"
                        onClick={() => setConfirmDelete(e.id)}
                        className="p-1 text-[var(--ink-3)] hover:text-[var(--error)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        aria-label="Edit experience"
                        onClick={() => onEdit(e)}
                        className="p-1 text-[var(--ink-3)] hover:text-[var(--ink)]"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {e.bullets.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {e.bullets.map((b, i) => (
                        <li key={i} className="flex gap-2 text-[13px] text-[var(--ink-2)]">
                          <span className="text-[var(--ink-3)]">–</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ExperienceDrawer
        open={open}
        onClose={() => setOpen(false)}
        experience={editing}
        onSave={handleSave}
      />

      {confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-5">
          <div
            className="w-full max-w-[400px] rounded-lg bg-white p-8"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.10)" }}
          >
            <h2 className="text-[18px] font-medium text-[var(--ink)]">Delete experience?</h2>
            <p className="mt-2 text-[13px] text-[var(--ink-2)]">This cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => handleDelete(confirmDelete)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ExperienceDrawer({
  open,
  onClose,
  experience,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  experience: Experience | null;
  onSave: (v: ExperienceFormValues) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExperienceFormValues>({
    resolver: zodResolver(experienceSchema),
    defaultValues: {
      org: "",
      role: "",
      type: "Internship",
      start_date: "",
      end_date: "",
      is_current: false,
      location: "",
      bullets: [],
    },
  });

  const [bulletInput, setBulletInput] = useState("");
  const bullets = watch("bullets") ?? [];
  const isCurrent = watch("is_current");

  useEffect(() => {
    if (!open) return;
    if (experience) {
      reset({
        org: experience.org,
        role: experience.role,
        type: experience.type as ExperienceFormValues["type"],
        start_date: experience.start_date,
        end_date: experience.end_date,
        is_current: experience.is_current,
        location: experience.location,
        bullets: experience.bullets,
      });
    } else {
      reset({
        org: "",
        role: "",
        type: "Internship",
        start_date: "",
        end_date: "",
        is_current: false,
        location: "",
        bullets: [],
      });
    }
    setBulletInput("");
  }, [experience, open, reset]);

  const addBullet = () => {
    const v = bulletInput.trim();
    if (v) setValue("bullets", [...bullets, v]);
    setBulletInput("");
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={experience ? "Edit experience" : "New experience"}
      footer={
        <Button variant="primary" size="lg" className="w-full" onClick={handleSubmit(onSave)}>
          {experience ? "Save changes" : "Add experience"}
        </Button>
      }
    >
      <FormField label="Organization" required error={errors.org?.message}>
        <Input {...register("org")} placeholder="Company, lab, or club name" error={!!errors.org} />
      </FormField>
      <FormField label="Your role" required error={errors.role?.message}>
        <Input
          {...register("role")}
          placeholder="e.g., Product Management Intern"
          error={!!errors.role}
        />
      </FormField>
      <FormField label="Type">
        <select
          {...register("type")}
          className="h-9 w-full rounded-[4px] border border-[var(--surface-3)] bg-white px-3 text-[15px] text-[var(--ink)] outline-none focus:border-[var(--ink)]"
        >
          {[
            "Internship",
            "Part-time",
            "Full-time",
            "Volunteer",
            "Research",
            "Freelance",
            "Other",
          ].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </FormField>
      <FormField label="Location">
        <Input {...register("location")} placeholder="City, State or Remote" />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Start date">
          <Input type="month" {...register("start_date")} />
        </FormField>
        <FormField label="End date">
          <Input type="month" {...register("end_date")} disabled={isCurrent} />
        </FormField>
      </div>
      <div className="mb-4 flex items-center gap-2">
        <input
          type="checkbox"
          id="is_current"
          {...register("is_current")}
          className="h-4 w-4 rounded border-[var(--surface-3)]"
        />
        <label htmlFor="is_current" className="text-[13px] text-[var(--ink-2)]">
          I currently work here
        </label>
      </div>

      <FormField label="Bullet points" helper="Press Enter to add each bullet">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={bulletInput}
              onChange={(e) => setBulletInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addBullet();
                }
              }}
              placeholder="Start with an action verb…"
            />
            <Button type="button" variant="secondary" size="md" onClick={addBullet}>
              Add
            </Button>
          </div>
          <div className="space-y-1.5">
            {bullets.map((b, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-md bg-[var(--surface-2)] px-3 py-2"
              >
                <span className="mt-0.5 text-[var(--ink-3)]">–</span>
                <span className="flex-1 text-[13px] text-[var(--ink-2)]">{b}</span>
                <button
                  type="button"
                  onClick={() =>
                    setValue(
                      "bullets",
                      bullets.filter((_, j) => j !== i),
                    )
                  }
                  className="text-[var(--ink-3)] hover:text-[var(--ink)]"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </FormField>
    </Drawer>
  );
}
