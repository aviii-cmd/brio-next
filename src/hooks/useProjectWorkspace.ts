import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  projectService,
  milestoneService,
  artifactService,
  tagService,
  calculateProjectReadiness,
  syncProjectSkills,
} from "@/services/api";
import { queryKeys } from "@/hooks/useData";
import type {
  ProjectStatus,
  ProjectMilestoneInsert,
  ProjectMilestoneUpdate,
  TagType,
} from "@/types/database";

// ============================================================
// QUERY KEYS
// ============================================================
export const workspaceKeys = {
  project: (id: string) => ["project", id] as const,
  milestones: (projectId: string) => ["project_milestones", projectId] as const,
  artifacts: (projectId: string) => ["project_artifacts", projectId] as const,
  tags: (userId: string) => ["tags", userId] as const,
  projectTags: (projectId: string) => ["project_tags", projectId] as const,
  publicProject: (id: string) => ["public_project", id] as const,
};

// ============================================================
// SINGLE PROJECT
// ============================================================
export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: workspaceKeys.project(projectId ?? ""),
    queryFn: () => projectService.getById(projectId!),
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });
}

export function usePublicProject(projectId: string | undefined) {
  return useQuery({
    queryKey: workspaceKeys.publicProject(projectId ?? ""),
    queryFn: () => projectService.getPublic(projectId!),
    enabled: !!projectId,
    staleTime: 60 * 1000,
    retry: false,
  });
}

// Autosave: patches a single project and keeps both the list cache and the
// detail cache in sync optimistically, without the "Project updated" toast
// (autosave has its own subtle "Saved" indicator instead).
export function useAutosaveProject(projectId: string, userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<Record<string, unknown>>) =>
      projectService.update(projectId, updates),
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: workspaceKeys.project(projectId) });
      const prevDetail = qc.getQueryData(workspaceKeys.project(projectId));
      qc.setQueryData(workspaceKeys.project(projectId), (old: typeof prevDetail) =>
        old ? { ...old, ...updates } : old,
      );
      qc.setQueryData(queryKeys.projects(userId), (old: unknown) =>
        Array.isArray(old)
          ? old.map((p: { id: string }) => (p.id === projectId ? { ...p, ...updates } : p))
          : old,
      );
      return { prevDetail };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevDetail) qc.setQueryData(workspaceKeys.project(projectId), ctx.prevDetail);
      toast.error("Couldn't save your last change — check your connection.");
    },
    onSuccess: (data, updates) => {
      qc.setQueryData(workspaceKeys.project(projectId), data);
      qc.invalidateQueries({ queryKey: queryKeys.projects(userId) });
      if ("skills" in updates || "title" in updates) {
        syncProjectSkills(userId).then(() => {
          qc.invalidateQueries({ queryKey: queryKeys.skills(userId) });
        });
      }
    },
  });
}

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

// Stateless autosave (PRD §6.1): batches field-level edits from anywhere on
// the project page into a single, debounced write with a subtle
// "Saving… / Saved" indicator. Multiple fields edited within the debounce
// window are merged into one request.
export function useProjectAutosave(projectId: string, userId: string, delay = 700) {
  const mutation = useAutosaveProject(projectId, userId);
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const pending = useRef<Record<string, unknown>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flush = useCallback(() => {
    if (Object.keys(pending.current).length === 0) return;
    const updates = pending.current;
    pending.current = {};
    setStatus("saving");
    mutation.mutate(updates, {
      onSuccess: () => setStatus("saved"),
      onError: () => setStatus("error"),
    });
  }, [mutation]);

  const save = useCallback(
    (updates: Record<string, unknown>) => {
      pending.current = { ...pending.current, ...updates };
      setStatus("saving");
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

  return { save, flushNow: flush, status };
}

export function useSetProjectStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProjectStatus; userId: string }) =>
      projectService.setStatus(id, status),
    onSuccess: (data, { userId }) => {
      qc.setQueryData(workspaceKeys.project(data.id), data);
      qc.invalidateQueries({ queryKey: queryKeys.projects(userId) });
      const message =
        data.status === "published"
          ? "Project published — it's now visible on your profile and shareable via link."
          : data.status === "archived"
            ? "Project archived"
            : "Reverted to draft";
      toast.success(message);
    },
    onError: () => toast.error("Failed to update project status"),
  });
}

export function useUploadCoverImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, projectId, file }: { userId: string; projectId: string; file: File }) =>
      projectService.uploadCoverImage(userId, projectId, file),
    onSuccess: (url, { projectId, userId }) => {
      qc.setQueryData(workspaceKeys.project(projectId), (old: unknown) =>
        old && typeof old === "object" ? { ...old, cover_image_url: url } : old,
      );
      qc.invalidateQueries({ queryKey: queryKeys.projects(userId) });
      toast.success("Cover image updated");
    },
    onError: (err: Error) => toast.error(err.message || "Upload failed — try a smaller image."),
  });
}

export function useRemoveCoverImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId }: { projectId: string; userId: string }) =>
      projectService.removeCoverImage(projectId),
    onSuccess: (data, { userId }) => {
      qc.setQueryData(workspaceKeys.project(data.id), data);
      qc.invalidateQueries({ queryKey: queryKeys.projects(userId) });
    },
  });
}

export function useDuplicateAsDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; userId: string }) => projectService.setStatus(id, "draft"),
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects(userId) });
    },
  });
}

// ============================================================
// READINESS (derived, not persisted)
// ============================================================
export function useProjectReadiness(projectId: string | undefined) {
  const { data: project } = useProject(projectId);
  const { data: milestones = [] } = useProjectMilestones(projectId);
  const { data: artifacts = [] } = useProjectArtifacts(projectId);
  const { data: tags = [] } = useProjectTags(projectId);

  if (!project) return null;
  return calculateProjectReadiness(project, {
    milestones: milestones.length,
    artifacts: artifacts.length,
    tags: tags.length,
  });
}

// ============================================================
// MILESTONES
// ============================================================
export function useProjectMilestones(projectId: string | undefined) {
  return useQuery({
    queryKey: workspaceKeys.milestones(projectId ?? ""),
    queryFn: () => milestoneService.list(projectId!),
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });
}

export function useCreateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (milestone: ProjectMilestoneInsert) => milestoneService.create(milestone),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: workspaceKeys.milestones(data.project_id) });
      toast.success("Milestone added");
    },
    onError: () => toast.error("Failed to add milestone"),
  });
}

export function useUpdateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: ProjectMilestoneUpdate;
      projectId: string;
    }) => milestoneService.update(id, updates),
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: workspaceKeys.milestones(projectId) });
    },
    onError: () => toast.error("Failed to update milestone"),
  });
}

export function useDeleteMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; projectId: string }) => milestoneService.delete(id),
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: workspaceKeys.milestones(projectId) });
      toast.success("Milestone removed");
    },
    onError: () => toast.error("Failed to remove milestone"),
  });
}

export function useReorderMilestones() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: { id: string; sort_order: number }[]; projectId: string }) =>
      milestoneService.reorder(items),
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: workspaceKeys.milestones(projectId) });
    },
  });
}

// ============================================================
// ARTIFACTS
// ============================================================
export function useProjectArtifacts(projectId: string | undefined) {
  return useQuery({
    queryKey: workspaceKeys.artifacts(projectId ?? ""),
    queryFn: () => artifactService.list(projectId!),
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });
}

export function useAddArtifactLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      link,
    }: {
      projectId: string;
      link: { url: string; category?: string; caption?: string };
    }) => artifactService.addLink(projectId, link),
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: workspaceKeys.artifacts(projectId) });
      toast.success("Link added");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to add link"),
  });
}

export function useUploadArtifact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      projectId,
      file,
      category,
      caption,
      onProgress,
    }: {
      userId: string;
      projectId: string;
      file: File;
      category?: string;
      caption?: string;
      onProgress?: (pct: number) => void;
    }) => artifactService.uploadFile(userId, projectId, file, { category, caption, onProgress }),
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: workspaceKeys.artifacts(projectId) });
      toast.success("Uploaded");
    },
    onError: (err: Error) => toast.error(err.message || "Upload failed — try a smaller file."),
  });
}

export function useUpdateArtifact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: { caption?: string; category?: string; sort_order?: number };
      projectId: string;
    }) => artifactService.update(id, updates),
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: workspaceKeys.artifacts(projectId) });
    },
    onError: () => toast.error("Failed to update artifact"),
  });
}

export function useDeleteArtifact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; projectId: string }) => artifactService.delete(id),
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: workspaceKeys.artifacts(projectId) });
      toast.success("Artifact removed");
    },
    onError: () => toast.error("Failed to remove artifact"),
  });
}

// ============================================================
// TAGS
// ============================================================
export function useTags(userId: string | undefined) {
  return useQuery({
    queryKey: workspaceKeys.tags(userId ?? ""),
    queryFn: () => tagService.list(userId!),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

export function useProjectTags(projectId: string | undefined) {
  return useQuery({
    queryKey: workspaceKeys.projectTags(projectId ?? ""),
    queryFn: () => tagService.listForProject(projectId!),
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });
}

export function useAddProjectTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      projectId,
      name,
      type,
    }: {
      userId: string;
      projectId: string;
      name: string;
      type: TagType;
    }) => {
      const tag = await tagService.getOrCreate(userId, name, type);
      await tagService.attachToProject(projectId, tag.id);
      return tag;
    },
    onSuccess: (_data, { projectId, userId }) => {
      qc.invalidateQueries({ queryKey: workspaceKeys.projectTags(projectId) });
      qc.invalidateQueries({ queryKey: workspaceKeys.tags(userId) });
    },
    onError: () => toast.error("Failed to add tag"),
  });
}

export function useRemoveProjectTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, tagId }: { projectId: string; tagId: string }) =>
      tagService.detachFromProject(projectId, tagId),
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: workspaceKeys.projectTags(projectId) });
    },
    onError: () => toast.error("Failed to remove tag"),
  });
}
