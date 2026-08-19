import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader, FormField, Input, EmptyState } from "@/components/brio/ui";
import { Drawer } from "@/components/brio/Drawer";
import { MoreHorizontal, Plus, GraduationCap, Trash2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useEducation,
  useCreateEducation,
  useUpdateEducation,
  useDeleteEducation,
} from "@/hooks/useData";
import type { Education } from "@/types/database";
import { educationSchema, type EducationFormValues } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

export const Route = createFileRoute("/dashboard/education")({
  head: () => ({ meta: [{ title: "Education — Brio" }] }),
  component: EducationPage,
});

function EducationPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const { data: education = [], isLoading } = useEducation(user?.id);
  const createEducation = useCreateEducation();
  const updateEducation = useUpdateEducation();
  const deleteEducation = useDeleteEducation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Education | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const onAdd = () => { setEditing(null); setOpen(true); };
  const onEdit = (e: Education) => { setEditing(e); setOpen(true); };

  const handleSave = (values: EducationFormValues) => {
    if (editing) {
      updateEducation.mutate({ id: editing.id, updates: values, userId });
    } else {
      createEducation.mutate({ ...values, user_id: userId });
    }
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteEducation.mutate({ id, userId });
    setConfirmDelete(null);
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Education" action={<Button variant="primary" onClick={onAdd}><Plus className="h-4 w-4" />Add education</Button>} />
        <div className="space-y-4">
          <div className="h-36 rounded-lg brio-skeleton" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Education"
        subtitle="Your academic background. Include high school and university."
        action={<Button variant="primary" onClick={onAdd}><Plus className="h-4 w-4" />Add education</Button>}
      />

      {education.length === 0 ? (
        <Card className="border-dashed">
          <EmptyState
            icon={<GraduationCap className="h-6 w-6" />}
            title="No education added yet"
            body="Add your current institution and any previous education. Include relevant coursework to show depth in your field."
            cta={
              <Button variant="primary" onClick={onAdd}>
                <Plus className="h-4 w-4" />Add your education
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {education.map((e) => (
            <Card key={e.id} hover className="bg-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-[15px] font-medium text-[var(--ink)]">{e.institution}</div>
                  <div className="text-[13px] text-[var(--ink-2)]">
                    {e.program}{e.field && e.field !== e.program ? ` · ${e.field}` : ""}
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--ink-3)]">
                    {e.start_year}
                    {e.end_year ? ` – ${e.is_current ? "Present" : e.end_year}` : ""}
                    {e.gpa ? ` · GPA: ${e.gpa}` : ""}
                  </div>
                  {e.coursework.length > 0 && (
                    <div className="mt-4">
                      <div className="mb-2 text-[11px] uppercase tracking-[0.04em] text-[var(--ink-3)]">
                        Key coursework
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {e.coursework.slice(0, 5).map((c) => <Badge key={c}>{c}</Badge>)}
                        {e.coursework.length > 5 && <Badge>+{e.coursework.length - 5} more</Badge>}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    aria-label="Delete education"
                    onClick={() => setConfirmDelete(e.id)}
                    className="p-1 text-[var(--ink-3)] hover:text-[var(--error)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    aria-label="Edit education"
                    onClick={() => onEdit(e)}
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

      <EducationDrawer
        open={open}
        onClose={() => setOpen(false)}
        education={editing}
        onSave={handleSave}
      />

      {confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-5">
          <div className="w-full max-w-[400px] rounded-lg bg-white p-8" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.10)" }}>
            <h2 className="text-[18px] font-medium text-[var(--ink)]">Delete education?</h2>
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

function EducationDrawer({
  open, onClose, education, onSave,
}: {
  open: boolean;
  onClose: () => void;
  education: Education | null;
  onSave: (v: EducationFormValues) => void;
}) {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<EducationFormValues>({
    resolver: zodResolver(educationSchema),
    defaultValues: {
      institution: "", program: "", field: "",
      start_year: "", end_year: "", gpa: null,
      coursework: [], is_current: false,
    },
  });

  const [courseInput, setCourseInput] = useState("");
  const coursework = watch("coursework") ?? [];
  const isCurrent = watch("is_current");

  useEffect(() => {
    if (!open) return;
    if (education) {
      reset({
        institution: education.institution,
        program: education.program,
        field: education.field,
        start_year: education.start_year,
        end_year: education.end_year,
        gpa: education.gpa,
        coursework: education.coursework,
        is_current: education.is_current,
      });
    } else {
      reset({ institution: "", program: "", field: "", start_year: "", end_year: "", gpa: null, coursework: [], is_current: false });
    }
    setCourseInput("");
  }, [education, open, reset]);

  const addCourse = () => {
    const v = courseInput.trim();
    if (v && !coursework.includes(v)) setValue("coursework", [...coursework, v]);
    setCourseInput("");
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={education ? "Edit education" : "New education"}
      footer={
        <Button variant="primary" size="lg" className="w-full" onClick={handleSubmit(onSave)}>
          {education ? "Save changes" : "Add education"}
        </Button>
      }
    >
      <FormField label="Institution" required error={errors.institution?.message}>
        <Input {...register("institution")} placeholder="University, college, or high school" error={!!errors.institution} />
      </FormField>
      <FormField label="Degree / Programme" required error={errors.program?.message}>
        <Input {...register("program")} placeholder="e.g., B.S. Computer Science" error={!!errors.program} />
      </FormField>
      <FormField label="Field of study">
        <Input {...register("field")} placeholder="e.g., Computer Science" />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Start year">
          <Input {...register("start_year")} placeholder="2022" />
        </FormField>
        <FormField label="End year">
          <Input {...register("end_year")} placeholder="2026" disabled={isCurrent} />
        </FormField>
      </div>
      <div className="mb-4 flex items-center gap-2">
        <input
          type="checkbox"
          id="edu_is_current"
          {...register("is_current")}
          className="h-4 w-4 rounded border-[var(--surface-3)]"
        />
        <label htmlFor="edu_is_current" className="text-[13px] text-[var(--ink-2)]">Currently enrolled</label>
      </div>
      <FormField label="GPA" helper="Optional">
        <Input {...register("gpa")} placeholder="3.8" />
      </FormField>
      <FormField label="Key coursework" helper="Press Enter to add each course">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={courseInput}
              onChange={(e) => setCourseInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCourse(); } }}
              placeholder="e.g., Data Structures"
            />
            <Button type="button" variant="secondary" size="md" onClick={addCourse}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {coursework.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setValue("coursework", coursework.filter((x) => x !== c))}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--surface-3)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--ink-2)]"
              >
                {c} <X className="h-3 w-3 text-[var(--ink-3)]" />
              </button>
            ))}
          </div>
        </div>
      </FormField>
    </Drawer>
  );
}
