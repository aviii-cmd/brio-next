import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FormField, Input, Toggle, PageHeader } from "@/components/brio/ui";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/brio/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile, useUploadAvatar, useRemoveAvatar } from "@/hooks/useData";
import { supabase } from "@/lib/supabase";
import { profileSchema, changePasswordSchema, privacySchema } from "@/lib/schemas";
import type { ProfileFormValues } from "@/lib/schemas";
import { ACADEMIC_LEVELS } from "@/types/database";
import type { AcademicLevel } from "@/types/database";
import { z } from "zod";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Brio" }] }),
  component: SettingsPageWrapper,
});

type PasswordFormValues = z.infer<typeof changePasswordSchema>;
type PrivacyFormValues = z.infer<typeof privacySchema>;

const sections = ["Profile", "Account", "Privacy & Sharing", "Danger Zone"] as const;

function SettingsPageWrapper() {
  return (
    <AuthGuard>
      <SettingsPage />
    </AuthGuard>
  );
}

function SettingsPage() {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const removeAvatar = useRemoveAvatar();
  const fileRef = useRef<HTMLInputElement>(null);

  const [active, setActive] = useState<(typeof sections)[number]>("Profile");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [emailConfirm, setEmailConfirm] = useState("");

  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      school: "",
      program: "",
      graduation_year: "",
      location: "",
      goal: "",
      intent: "",
      academic_level: "",
    },
  });

  // Password form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  // Privacy form
  const privacyForm = useForm<PrivacyFormValues>({
    resolver: zodResolver(privacySchema),
    defaultValues: { is_public: true, show_in_search: false, allow_resume_requests: true },
  });

  useEffect(() => {
    if (!profile) return;
    profileForm.reset({
      name: profile.name,
      school: profile.school,
      program: profile.program,
      graduation_year: profile.graduation_year,
      location: profile.location,
      goal: profile.goal,
      intent: profile.intent,
      academic_level: profile.academic_level ?? "",
    });
    privacyForm.reset({
      is_public: profile.is_public,
      show_in_search: profile.show_in_search,
      allow_resume_requests: profile.allow_resume_requests,
    });
  }, [profile]);

  const handleProfileSave = (values: ProfileFormValues) => {
    if (!user?.id) return;
    updateProfile.mutate({
      userId: user.id,
      updates: {
        ...values,
        academic_level: (values.academic_level || null) as AcademicLevel | null,
      },
    });
  };

  const handlePasswordChange = async (values: PasswordFormValues) => {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? "",
      password: values.currentPassword,
    });
    if (signInError) {
      passwordForm.setError("currentPassword", { message: "Current password is incorrect." });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: values.newPassword });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated");
      passwordForm.reset();
    }
  };

  const handlePrivacySave = (values: PrivacyFormValues) => {
    if (!user?.id) return;
    updateProfile.mutate({ userId: user.id, updates: values });
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    uploadAvatar.mutate({ userId: user.id, file });
  };

  const handleDeleteAccount = async () => {
    if (emailConfirm !== user?.email) return;
    await signOut();
    toast.success("Account deletion requested. Contact support to complete.");
  };

  const initials = profile?.initials ?? "?";

  return (
    <div className="min-h-dvh bg-[var(--surface)]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:px-10 md:py-10">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <PageHeader title="Settings" />
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-[13px] text-[var(--ink-2)] hover:text-[var(--ink)] shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)] rounded-sm"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Back to dashboard</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>

        <div className="grid gap-8 md:grid-cols-[200px_1fr]">
          {/* Desktop: vertical nav  |  Mobile: horizontal scroll tabs */}
          <nav aria-label="Settings sections" className="md:space-y-1">
            {/* Mobile: horizontal scrollable */}
            <div className="flex gap-1 overflow-x-auto pb-1 md:hidden scrollbar-hide -mx-4 px-4">
              {sections.map((s) => (
                <button
                  key={s}
                  onClick={() => setActive(s)}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-2 text-[13px] transition-colors whitespace-nowrap min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]",
                    active === s
                      ? "bg-[var(--ink)] text-white font-medium"
                      : "bg-[var(--surface-2)] text-[var(--ink-2)] hover:bg-[var(--surface-3)] hover:text-[var(--ink)]",
                  )}
                  aria-current={active === s ? "true" : undefined}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Desktop: vertical nav */}
            {sections.map((s) => (
              <button
                key={s}
                onClick={() => setActive(s)}
                className={cn(
                  "relative hidden w-full text-left text-[13px] transition-colors px-3 py-2.5 rounded-[4px] md:block min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:ring-offset-1",
                  active === s
                    ? "font-medium text-[var(--ink)] bg-[var(--surface-2)]"
                    : "text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]",
                )}
                aria-current={active === s ? "true" : undefined}
              >
                {active === s && (
                  <span
                    className="absolute left-0 top-0 h-full w-0.5 rounded-l-[4px] bg-[var(--ink)]"
                    aria-hidden="true"
                  />
                )}
                {s}
              </button>
            ))}
          </nav>

          <div className="min-w-0">
            {active === "Profile" && (
              <Section title="Profile">
                <form onSubmit={profileForm.handleSubmit(handleProfileSave)}>
                  <FormField label="Full name" error={profileForm.formState.errors.name?.message}>
                    <Input {...profileForm.register("name")} />
                  </FormField>
                  <FormField label="Institution">
                    <Input
                      {...profileForm.register("school")}
                      placeholder="Your university or school"
                    />
                  </FormField>
                  <FormField label="Degree / Programme">
                    <Input
                      {...profileForm.register("program")}
                      placeholder="e.g., B.S. Computer Science"
                    />
                  </FormField>
                  <FormField label="Graduation year">
                    <Input {...profileForm.register("graduation_year")} placeholder="2026" />
                  </FormField>
                  <FormField
                    label="Current grade / year"
                    helper="Powers grade-eligible matches in Discover."
                  >
                    <select
                      {...profileForm.register("academic_level")}
                      className="h-9 w-full rounded-[4px] border border-[var(--surface-3)] bg-white px-3 text-[15px] text-[var(--ink)] outline-none focus:border-[var(--ink)] focus:ring-2 focus:ring-[rgba(10,10,10,0.08)] transition-all duration-150"
                    >
                      <option value="">Not set</option>
                      {ACADEMIC_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Location">
                    <Input {...profileForm.register("location")} placeholder="City, Country" />
                  </FormField>
                  <FormField
                    label="Goal statement"
                    helper="One sentence describing what you're looking for."
                  >
                    <Input
                      {...profileForm.register("goal")}
                      placeholder="Seeking a PM internship at a consumer tech company."
                    />
                  </FormField>
                  <FormField label="Primary intent">
                    <select
                      {...profileForm.register("intent")}
                      className="h-9 w-full rounded-[4px] border border-[var(--surface-3)] bg-white px-3 text-[15px] text-[var(--ink)] outline-none focus:border-[var(--ink)] focus:ring-2 focus:ring-[rgba(10,10,10,0.08)] transition-all duration-150"
                    >
                      <option value="">Select…</option>
                      <option value="Internship search">Internship search</option>
                      <option value="Research opportunities">Research opportunities</option>
                      <option value="University applications">University applications</option>
                      <option value="Personal portfolio">Personal portfolio</option>
                    </select>
                  </FormField>

                  <div className="mb-6">
                    <div className="mb-2 text-[13px] font-medium text-[var(--ink-2)]">
                      Profile photo
                    </div>
                    <div className="flex items-center gap-4">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.name}
                          className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-[var(--surface-3)]"
                        />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--surface-3)] text-[18px] text-[var(--ink-2)]">
                          {initials}
                        </div>
                      )}
                      <div>
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarUpload}
                          aria-label="Upload profile photo"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => fileRef.current?.click()}
                          loading={uploadAvatar.isPending}
                        >
                          Upload photo
                        </Button>
                        {profile?.avatar_url && (
                          <button
                            type="button"
                            className="ml-2 text-[13px] text-[var(--ink-3)] hover:text-[var(--error)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--error)] rounded"
                            onClick={() => user?.id && removeAvatar.mutate(user.id)}
                          >
                            Remove
                          </button>
                        )}
                        <p className="mt-1.5 text-[11px] text-[var(--ink-3)]">
                          JPG, PNG or WebP, max 5MB
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button type="submit" variant="primary" loading={updateProfile.isPending}>
                    Save changes
                  </Button>
                </form>
              </Section>
            )}

            {active === "Account" && (
              <Section title="Account">
                <div className="mb-6">
                  <div className="mb-2 text-[13px] font-medium text-[var(--ink-2)]">
                    Email address
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <Input value={user?.email ?? ""} disabled />
                    </div>
                    <span className="text-[11px] text-[var(--ink-3)] shrink-0">
                      {user?.email_confirmed_at ? "Verified" : "Unverified"}
                    </span>
                  </div>
                </div>

                <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)}>
                  <h3 className="mb-4 text-[15px] font-medium text-[var(--ink)]">
                    Change password
                  </h3>
                  <FormField
                    label="Current password"
                    error={passwordForm.formState.errors.currentPassword?.message}
                  >
                    <Input
                      type="password"
                      {...passwordForm.register("currentPassword")}
                      autoComplete="current-password"
                    />
                  </FormField>
                  <FormField
                    label="New password"
                    error={passwordForm.formState.errors.newPassword?.message}
                  >
                    <Input
                      type="password"
                      {...passwordForm.register("newPassword")}
                      autoComplete="new-password"
                    />
                  </FormField>
                  <FormField
                    label="Confirm new password"
                    error={passwordForm.formState.errors.confirmPassword?.message}
                  >
                    <Input
                      type="password"
                      {...passwordForm.register("confirmPassword")}
                      autoComplete="new-password"
                    />
                  </FormField>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={passwordForm.formState.isSubmitting}
                  >
                    Update password
                  </Button>
                </form>
              </Section>
            )}

            {active === "Privacy & Sharing" && (
              <Section title="Privacy & Sharing">
                <form onSubmit={privacyForm.handleSubmit(handlePrivacySave)}>
                  {(
                    [
                      [
                        "is_public",
                        "Public profile",
                        "Anyone with the link can view your profile.",
                      ],
                      [
                        "show_in_search",
                        "Show in search results",
                        "Allow your profile to appear in Brio discovery.",
                      ],
                      [
                        "allow_resume_requests",
                        "Allow resume export requests",
                        "Reviewers can request a tailored resume from you.",
                      ],
                    ] as const
                  ).map(([k, l, d], i) => (
                    <div
                      key={k}
                      className={cn(
                        "flex items-start justify-between gap-4 py-4",
                        i > 0 && "border-t border-[var(--surface-3)]",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-[var(--ink)]">{l}</div>
                        <div className="mt-0.5 text-[11px] text-[var(--ink-3)]">{d}</div>
                      </div>
                      <div className="shrink-0 pt-0.5">
                        <Toggle
                          checked={privacyForm.watch(k)}
                          onChange={(v) => privacyForm.setValue(k, v)}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="mt-6">
                    <Button type="submit" variant="primary" loading={updateProfile.isPending}>
                      Save privacy settings
                    </Button>
                  </div>
                </form>
              </Section>
            )}

            {active === "Danger Zone" && (
              <Section title="Danger Zone">
                <p className="text-[13px] text-[var(--ink-2)]">
                  Permanently delete your Brio account and all associated data. This cannot be
                  undone.
                </p>
                <div className="mt-4">
                  <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
                    Delete my account
                  </Button>
                </div>
              </Section>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div
            className="w-full max-w-[480px] rounded-lg bg-white p-6 sm:p-8"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.10)" }}
          >
            <h2 id="delete-modal-title" className="text-[18px] font-medium text-[var(--ink)]">
              Delete account
            </h2>
            <p className="mt-2 text-[13px] text-[var(--ink-2)]">
              This action is permanent. All your projects, experiences, and exports will be deleted.
              Type <span className="break-all font-mono text-[var(--ink)]">{user?.email}</span> to
              confirm.
            </p>
            <div className="mt-4">
              <Input
                value={emailConfirm}
                onChange={(e) => setEmailConfirm(e.target.value)}
                placeholder={user?.email ?? ""}
                aria-label="Confirm email address"
              />
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={emailConfirm !== user?.email}
                onClick={handleDeleteAccount}
              >
                Delete permanently
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-6 text-[18px] font-medium text-[var(--ink)]">{title}</h2>
      {children}
    </div>
  );
}
