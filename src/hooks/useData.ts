import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  profileService,
  projectService,
  experienceService,
  educationService,
  achievementService,
  skillService,
  onboardingService,
  calculateProfileCompletion,
  syncProjectSkills,
} from "@/services/api";
import type {
  ProfileUpdate,
  ProjectInsert,
  ProjectUpdate,
  ExperienceInsert,
  ExperienceUpdate,
  EducationInsert,
  EducationUpdate,
  AchievementInsert,
  AchievementUpdate,
  SkillInsert,
  OnboardingDraftUpdate,
} from "@/types/database";

// ============================================================
// QUERY KEYS
// ============================================================
export const queryKeys = {
  profile: (userId: string) => ["profile", userId] as const,
  projects: (userId: string) => ["projects", userId] as const,
  experience: (userId: string) => ["experience", userId] as const,
  education: (userId: string) => ["education", userId] as const,
  achievements: (userId: string) => ["achievements", userId] as const,
  skills: (userId: string) => ["skills", userId] as const,
  onboardingDraft: (userId: string) => ["onboarding_draft", userId] as const,
  profileCounts: (userId: string) => ["profile_counts", userId] as const,
};

// ============================================================
// PROFILE HOOKS
// ============================================================
export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profile(userId ?? ""),
    queryFn: () => profileService.get(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: ProfileUpdate }) =>
      profileService.update(userId, updates),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.profile(data.id), data);
      toast.success("Profile saved");
    },
    onError: () => toast.error("Failed to save profile"),
  });
}

export function useUploadAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, file }: { userId: string; file: File }) =>
      profileService.uploadAvatar(userId, file),
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.profile(userId) });
      toast.success("Avatar updated");
    },
    onError: () => toast.error("Failed to upload avatar"),
  });
}

export function useRemoveAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => profileService.removeAvatar(userId),
    onSuccess: (_, userId) => {
      qc.invalidateQueries({ queryKey: queryKeys.profile(userId) });
      toast.success("Avatar removed");
    },
    onError: () => toast.error("Failed to remove avatar"),
  });
}

// ============================================================
// PROJECT HOOKS
// ============================================================
export function useProjects(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects(userId ?? ""),
    queryFn: () => projectService.list(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (project: ProjectInsert) => projectService.create(project),
    onSuccess: async (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects(data.user_id) });
      await syncProjectSkills(data.user_id);
      qc.invalidateQueries({ queryKey: queryKeys.skills(data.user_id) });
      toast.success("Project added");
    },
    onError: () => toast.error("Failed to add project"),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: ProjectUpdate; userId: string }) =>
      projectService.update(id, updates),
    onMutate: async ({ id, updates, userId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.projects(userId) });
      const prev = qc.getQueryData(queryKeys.projects(userId));
      qc.setQueryData(queryKeys.projects(userId), (old: typeof prev) =>
        Array.isArray(old)
          ? old.map((p: { id: string }) => (p.id === id ? { ...p, ...updates } : p))
          : old,
      );
      return { prev, userId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) qc.setQueryData(queryKeys.projects(ctx.userId), ctx.prev);
      toast.error("Failed to update project");
    },
    onSuccess: async (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects(userId) });
      await syncProjectSkills(userId);
      qc.invalidateQueries({ queryKey: queryKeys.skills(userId) });
      toast.success("Project updated");
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; userId: string }) => projectService.delete(id),
    onMutate: async ({ id, userId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.projects(userId) });
      const prev = qc.getQueryData(queryKeys.projects(userId));
      qc.setQueryData(queryKeys.projects(userId), (old: typeof prev) =>
        Array.isArray(old) ? old.filter((p: { id: string }) => p.id !== id) : old,
      );
      return { prev, userId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) qc.setQueryData(queryKeys.projects(ctx.userId), ctx.prev);
      toast.error("Failed to delete project");
    },
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects(userId) });
      toast.success("Project deleted");
    },
  });
}

// ============================================================
// EXPERIENCE HOOKS
// ============================================================
export function useExperience(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.experience(userId ?? ""),
    queryFn: () => experienceService.list(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (exp: ExperienceInsert) => experienceService.create(exp),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.experience(data.user_id) });
      toast.success("Experience added");
    },
    onError: () => toast.error("Failed to add experience"),
  });
}

export function useUpdateExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: ExperienceUpdate; userId: string }) =>
      experienceService.update(id, updates),
    onMutate: async ({ id, updates, userId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.experience(userId) });
      const prev = qc.getQueryData(queryKeys.experience(userId));
      qc.setQueryData(queryKeys.experience(userId), (old: typeof prev) =>
        Array.isArray(old)
          ? old.map((e: { id: string }) => (e.id === id ? { ...e, ...updates } : e))
          : old,
      );
      return { prev, userId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) qc.setQueryData(queryKeys.experience(ctx.userId), ctx.prev);
      toast.error("Failed to update experience");
    },
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.experience(userId) });
      toast.success("Experience updated");
    },
  });
}

export function useDeleteExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; userId: string }) => experienceService.delete(id),
    onMutate: async ({ id, userId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.experience(userId) });
      const prev = qc.getQueryData(queryKeys.experience(userId));
      qc.setQueryData(queryKeys.experience(userId), (old: typeof prev) =>
        Array.isArray(old) ? old.filter((e: { id: string }) => e.id !== id) : old,
      );
      return { prev, userId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) qc.setQueryData(queryKeys.experience(ctx.userId), ctx.prev);
      toast.error("Failed to delete experience");
    },
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.experience(userId) });
      toast.success("Experience deleted");
    },
  });
}

// ============================================================
// EDUCATION HOOKS
// ============================================================
export function useEducation(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.education(userId ?? ""),
    queryFn: () => educationService.list(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateEducation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (edu: EducationInsert) => educationService.create(edu),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.education(data.user_id) });
      toast.success("Education added");
    },
    onError: () => toast.error("Failed to add education"),
  });
}

export function useUpdateEducation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: EducationUpdate; userId: string }) =>
      educationService.update(id, updates),
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.education(userId) });
      toast.success("Education updated");
    },
    onError: () => toast.error("Failed to update education"),
  });
}

export function useDeleteEducation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; userId: string }) => educationService.delete(id),
    onMutate: async ({ id, userId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.education(userId) });
      const prev = qc.getQueryData(queryKeys.education(userId));
      qc.setQueryData(queryKeys.education(userId), (old: typeof prev) =>
        Array.isArray(old) ? old.filter((e: { id: string }) => e.id !== id) : old,
      );
      return { prev, userId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) qc.setQueryData(queryKeys.education(ctx.userId), ctx.prev);
      toast.error("Failed to delete education");
    },
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.education(userId) });
      toast.success("Education deleted");
    },
  });
}

// ============================================================
// ACHIEVEMENT HOOKS
// ============================================================
export function useAchievements(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.achievements(userId ?? ""),
    queryFn: () => achievementService.list(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateAchievement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (achievement: AchievementInsert) => achievementService.create(achievement),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.achievements(data.user_id) });
      toast.success("Achievement added");
    },
    onError: () => toast.error("Failed to add achievement"),
  });
}

export function useUpdateAchievement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: AchievementUpdate; userId: string }) =>
      achievementService.update(id, updates),
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.achievements(userId) });
      toast.success("Achievement updated");
    },
    onError: () => toast.error("Failed to update achievement"),
  });
}

export function useDeleteAchievement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; userId: string }) => achievementService.delete(id),
    onMutate: async ({ id, userId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.achievements(userId) });
      const prev = qc.getQueryData(queryKeys.achievements(userId));
      qc.setQueryData(queryKeys.achievements(userId), (old: typeof prev) =>
        Array.isArray(old) ? old.filter((a: { id: string }) => a.id !== id) : old,
      );
      return { prev, userId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) qc.setQueryData(queryKeys.achievements(ctx.userId), ctx.prev);
      toast.error("Failed to delete achievement");
    },
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.achievements(userId) });
      toast.success("Achievement deleted");
    },
  });
}

// ============================================================
// SKILLS HOOKS
// ============================================================
export function useSkills(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.skills(userId ?? ""),
    queryFn: () => skillService.list(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useUpsertSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, skill }: { userId: string; skill: Omit<SkillInsert, "user_id"> }) =>
      skillService.upsert(userId, skill),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.skills(data.user_id) });
    },
    onError: () => toast.error("Failed to save skill"),
  });
}

export function useDeleteSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; userId: string }) => skillService.delete(id),
    onMutate: async ({ id, userId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.skills(userId) });
      const prev = qc.getQueryData(queryKeys.skills(userId));
      qc.setQueryData(queryKeys.skills(userId), (old: typeof prev) =>
        Array.isArray(old) ? old.filter((s: { id: string }) => s.id !== id) : old,
      );
      return { prev, userId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) qc.setQueryData(queryKeys.skills(ctx.userId), ctx.prev);
      toast.error("Failed to delete skill");
    },
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.skills(userId) });
      toast.success("Skill removed");
    },
  });
}

// ============================================================
// ONBOARDING HOOKS
// ============================================================
export function useOnboardingDraft(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.onboardingDraft(userId ?? ""),
    queryFn: () => onboardingService.getDraft(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

export function useSaveOnboardingDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: OnboardingDraftUpdate }) =>
      onboardingService.saveDraft(userId, updates),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.onboardingDraft(data.user_id), data);
    },
  });
}

// Debounced, batched draft autosave (same idea as useProjectAutosave): field
// edits made within the delay window — e.g. every keystroke in a name or
// goal field — are merged into one write instead of firing a request per
// keystroke. That per-keystroke round trip was also feeding back into the
// "restore draft" effect on the onboarding page and clobbering in-progress
// typing, so batching it here removes most of the churn at the source.
export function useOnboardingDraftAutosave(userId: string | undefined, delay = 600) {
  const mutation = useSaveOnboardingDraft();
  const pending = useRef<OnboardingDraftUpdate>({});
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flush = useCallback(() => {
    if (!userId || Object.keys(pending.current).length === 0) return;
    const updates = pending.current;
    pending.current = {};
    mutation.mutate({ userId, updates });
  }, [mutation, userId]);

  const save = useCallback(
    (updates: OnboardingDraftUpdate) => {
      pending.current = { ...pending.current, ...updates };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [flush, delay],
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { save, flushNow: flush };
}

// ============================================================
// COMPOSITE: profile counts hook
// ============================================================
export function useProfileCounts(userId: string | undefined) {
  const { data: projects = [] } = useProjects(userId);
  const { data: experience = [] } = useExperience(userId);
  const { data: education = [] } = useEducation(userId);
  const { data: achievements = [] } = useAchievements(userId);
  const { data: skills = [] } = useSkills(userId);

  return {
    projects: projects.length,
    experience: experience.length,
    education: education.length,
    achievements: achievements.length,
    skills: skills.length,
  };
}

export function useProfileCompletion(userId: string | undefined) {
  const { data: profile } = useProfile(userId);
  const counts = useProfileCounts(userId);
  return calculateProfileCompletion(profile ?? null, counts);
}
