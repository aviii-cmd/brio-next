import { supabase } from "@/lib/supabase";
import { PROJECT_TEMPLATE_BLUEPRINTS } from "@/lib/projectTemplates";
import type {
  Profile,
  ProfileUpdate,
  Project,
  ProjectInsert,
  ProjectUpdate,
  Experience,
  ExperienceInsert,
  ExperienceUpdate,
  Education,
  EducationInsert,
  EducationUpdate,
  Achievement,
  AchievementInsert,
  AchievementUpdate,
  Skill,
  SkillInsert,
  OnboardingDraft,
  OnboardingDraftUpdate,
  ProjectStatus,
  ProjectMilestone,
  ProjectMilestoneInsert,
  ProjectMilestoneUpdate,
  ProjectTask,
  ProjectTaskInsert,
  ProjectTaskUpdate,
  ProjectArtifact,
  ProjectArtifactInsert,
  Tag,
  TagInsert,
  TagType,
} from "@/types/database";

// ============================================================
// PROFILE
// ============================================================
export const profileService = {
  async get(userId: string): Promise<Profile> {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (error) throw error;
    return data;
  },

  async update(userId: string, updates: ProfileUpdate): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async uploadAvatar(userId: string, file: File): Promise<string> {
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    // Update profile with avatar URL
    await profileService.update(userId, { avatar_url: data.publicUrl });
    return data.publicUrl;
  },

  async removeAvatar(userId: string): Promise<void> {
    const profile = await profileService.get(userId);
    if (profile.avatar_url) {
      const path = profile.avatar_url.split("/").slice(-2).join("/");
      await supabase.storage.from("avatars").remove([path]);
    }
    await profileService.update(userId, { avatar_url: null });
  },
};

// ============================================================
// PROJECTS
// ============================================================
export const projectService = {
  async list(userId: string): Promise<Project[]> {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(project: ProjectInsert): Promise<Project> {
    const { data, error } = await supabase.from("projects").insert(project).select().single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: ProjectUpdate): Promise<Project> {
    const { data, error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    // Storage objects aren't removed by the DB cascade — clean up the
    // project's folder (cover image + any uploaded artifacts) first.
    try {
      const prefix = await projectService.resolveArtifactFolder(id);
      if (prefix) {
        const { data: objects } = await supabase.storage.from("project-artifacts").list(prefix);
        if (objects && objects.length > 0) {
          await supabase.storage
            .from("project-artifacts")
            .remove(objects.map((o) => `${prefix}/${o.name}`));
        }
      }
    } catch {
      // Best-effort cleanup — don't block project deletion if storage listing fails.
    }
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) throw error;
  },

  // Storage paths are namespaced `${userId}/${projectId}/...`; we only have
  // the projectId here, so look up the owner first to build the folder path.
  async resolveArtifactFolder(projectId: string): Promise<string | null> {
    const { data } = await supabase
      .from("projects")
      .select("user_id")
      .eq("id", projectId)
      .maybeSingle();
    return data ? `${data.user_id}/${projectId}` : null;
  },

  async toggleFeatured(id: string, featured: boolean): Promise<Project> {
    return projectService.update(id, { featured });
  },

  async getById(id: string): Promise<Project> {
    const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  },

  // Public, unauthenticated read of a published project — used by the
  // shareable reviewer link. Relies on the "Published projects are
  // publicly viewable" RLS policy.
  async getPublic(id: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async setStatus(id: string, status: ProjectStatus): Promise<Project> {
    const updates: ProjectUpdate & { published_at?: string | null } =
      status === "published" ? { status, published_at: new Date().toISOString() } : { status };
    const { data, error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async uploadCoverImage(userId: string, projectId: string, file: File): Promise<string> {
    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      throw new Error("File too large — try an image under 10MB.");
    }
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${projectId}/cover.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("project-artifacts")
      .upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("project-artifacts").getPublicUrl(path);
    // Cache-bust so the new cover shows immediately even though the path is stable.
    const url = `${data.publicUrl}?v=${Date.now()}`;
    await projectService.update(projectId, { cover_image_url: url });
    return url;
  },

  async removeCoverImage(projectId: string): Promise<Project> {
    return projectService.update(projectId, { cover_image_url: null });
  },
};

// ============================================================
// EXPERIENCE
// ============================================================
export const experienceService = {
  async list(userId: string): Promise<Experience[]> {
    const { data, error } = await supabase
      .from("experience")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(exp: ExperienceInsert): Promise<Experience> {
    const { data, error } = await supabase.from("experience").insert(exp).select().single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: ExperienceUpdate): Promise<Experience> {
    const { data, error } = await supabase
      .from("experience")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("experience").delete().eq("id", id);
    if (error) throw error;
  },
};

// ============================================================
// EDUCATION
// ============================================================
export const educationService = {
  async list(userId: string): Promise<Education[]> {
    const { data, error } = await supabase
      .from("education")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(edu: EducationInsert): Promise<Education> {
    const { data, error } = await supabase.from("education").insert(edu).select().single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: EducationUpdate): Promise<Education> {
    const { data, error } = await supabase
      .from("education")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("education").delete().eq("id", id);
    if (error) throw error;
  },
};

// ============================================================
// ACHIEVEMENTS
// ============================================================
export const achievementService = {
  async list(userId: string): Promise<Achievement[]> {
    const { data, error } = await supabase
      .from("achievements")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .order("year", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(achievement: AchievementInsert): Promise<Achievement> {
    const { data, error } = await supabase
      .from("achievements")
      .insert(achievement)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: AchievementUpdate): Promise<Achievement> {
    const { data, error } = await supabase
      .from("achievements")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("achievements").delete().eq("id", id);
    if (error) throw error;
  },
};

// ============================================================
// SKILLS
// ============================================================
export const skillService = {
  async list(userId: string): Promise<Skill[]> {
    const { data, error } = await supabase
      .from("skills")
      .select("*")
      .eq("user_id", userId)
      .order("category")
      .order("sort_order");
    if (error) throw error;
    return data ?? [];
  },

  async upsert(userId: string, skill: Omit<SkillInsert, "user_id">): Promise<Skill> {
    const { data, error } = await supabase
      .from("skills")
      .upsert({ ...skill, user_id: userId }, { onConflict: "user_id,name" })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("skills").delete().eq("id", id);
    if (error) throw error;
  },

  // Sync skills from projects — called after project save
  async syncFromProjects(userId: string, projects: Project[]): Promise<void> {
    const skillMap = new Map<string, string[]>();
    for (const project of projects) {
      for (const skill of project.skills) {
        const trimmed = skill.trim();
        if (!trimmed) continue;
        const existing = skillMap.get(trimmed) ?? [];
        skillMap.set(trimmed, [...existing, project.title]);
      }
    }
    const upserts: SkillInsert[] = Array.from(skillMap.entries()).map(([name, linkedTo]) => ({
      user_id: userId,
      name,
      category: "Technical" as const,
      source: "project",
      linked_to: linkedTo,
    }));
    if (upserts.length > 0) {
      const { error } = await supabase
        .from("skills")
        .upsert(upserts, { onConflict: "user_id,name" });
      if (error) throw error;
    }
  },
};

// Re-derives the Skills module from the user's current projects. Called
// after any project write that could touch `skills` or `title` (title is
// stored as `linked_to` on each derived skill). Fire this after every
// project create/update/autosave so the Skills Integration requirement
// (PRD §4, Must Have) stays accurate without the caller having to know
// which fields changed.
export async function syncProjectSkills(userId: string): Promise<void> {
  const projects = await projectService.list(userId);
  await skillService.syncFromProjects(userId, projects);
}

// ============================================================
// PROJECT MILESTONES (Timeline & Milestones)
// ============================================================
export const milestoneService = {
  async list(projectId: string): Promise<ProjectMilestone[]> {
    const { data, error } = await supabase
      .from("project_milestones")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async create(milestone: ProjectMilestoneInsert): Promise<ProjectMilestone> {
    const { data, error } = await supabase
      .from("project_milestones")
      .insert(milestone)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: ProjectMilestoneUpdate): Promise<ProjectMilestone> {
    const { data, error } = await supabase
      .from("project_milestones")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("project_milestones").delete().eq("id", id);
    if (error) throw error;
  },

  async reorder(items: { id: string; sort_order: number }[]): Promise<void> {
    await Promise.all(
      items.map((i) =>
        supabase.from("project_milestones").update({ sort_order: i.sort_order }).eq("id", i.id),
      ),
    );
  },
};

// ============================================================
// PROJECT TASKS (Project Workflow)
// ============================================================
export async function setupProjectTemplate(projectId: string, userId: string, template: string) {
  const blueprint = PROJECT_TEMPLATE_BLUEPRINTS[template] ?? PROJECT_TEMPLATE_BLUEPRINTS.blank;
  if (blueprint.milestones.length > 0) {
    const { error } = await supabase.from("project_milestones").insert(
      blueprint.milestones.map((title, index) => ({
        project_id: projectId,
        title,
        sort_order: index,
      })),
    );
    if (error) throw error;
  }
  if (blueprint.tasks.length > 0) {
    const { error } = await supabase.from("project_tasks").insert(
      blueprint.tasks.map((task, index) => ({
        project_id: projectId,
        user_id: userId,
        title: task.title,
        priority: task.priority,
        sort_order: index,
      })),
    );
    if (error) throw error;
  }
}

export const projectTaskService = {
  async list(projectId: string): Promise<ProjectTask[]> {
    const { data, error } = await supabase
      .from("project_tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async listForUser(userId: string): Promise<ProjectTask[]> {
    const { data, error } = await supabase
      .from("project_tasks")
      .select("*")
      .eq("user_id", userId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async create(task: ProjectTaskInsert): Promise<ProjectTask> {
    const { data, error } = await supabase.from("project_tasks").insert(task).select().single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: ProjectTaskUpdate): Promise<ProjectTask> {
    const { data, error } = await supabase
      .from("project_tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("project_tasks").delete().eq("id", id);
    if (error) throw error;
  },

  async reorder(items: { id: string; sort_order: number }[]): Promise<void> {
    await Promise.all(
      items.map((item) =>
        supabase.from("project_tasks").update({ sort_order: item.sort_order }).eq("id", item.id),
      ),
    );
  },
};

// ============================================================
// PROJECT ARTIFACTS (Artifact Gallery)
// ============================================================
const ARTIFACT_BUCKET = "project-artifacts";

function inferArtifactKind(mimeType: string): "image" | "video" | "file" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "file";
}

export const artifactService = {
  async list(projectId: string): Promise<ProjectArtifact[]> {
    const { data, error } = await supabase
      .from("project_artifacts")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async addLink(
    projectId: string,
    link: { url: string; category?: string; caption?: string },
  ): Promise<ProjectArtifact> {
    const { data, error } = await supabase
      .from("project_artifacts")
      .insert({
        project_id: projectId,
        kind: "link",
        url: link.url,
        category: link.category || "General",
        caption: link.caption || "",
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async uploadFile(
    userId: string,
    projectId: string,
    file: File,
    options?: { category?: string; caption?: string; onProgress?: (pct: number) => void },
  ): Promise<ProjectArtifact> {
    // 25MB limit mirrors the storage bucket's file_size_limit — checked
    // client-side first so the user gets an immediate, human-readable error.
    const MAX_BYTES = 25 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      throw new Error("File too large — please upload something under 25MB.");
    }

    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${userId}/${projectId}/${crypto.randomUUID()}.${ext}`;

    options?.onProgress?.(10);
    const { error: uploadError } = await supabase.storage
      .from(ARTIFACT_BUCKET)
      .upload(path, file, { upsert: false });
    if (uploadError) throw uploadError;
    options?.onProgress?.(80);

    const { data: urlData } = supabase.storage.from(ARTIFACT_BUCKET).getPublicUrl(path);

    const { data, error } = await supabase
      .from("project_artifacts")
      .insert({
        project_id: projectId,
        kind: inferArtifactKind(file.type),
        url: urlData.publicUrl,
        storage_path: path,
        category: options?.category || "General",
        caption: options?.caption || "",
        file_name: file.name,
        file_size: file.size,
      })
      .select()
      .single();
    if (error) throw error;
    options?.onProgress?.(100);
    return data;
  },

  async update(
    id: string,
    updates: { caption?: string; category?: string; sort_order?: number },
  ): Promise<ProjectArtifact> {
    const { data, error } = await supabase
      .from("project_artifacts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { data: artifact } = await supabase
      .from("project_artifacts")
      .select("storage_path")
      .eq("id", id)
      .single();
    if (artifact?.storage_path) {
      await supabase.storage.from(ARTIFACT_BUCKET).remove([artifact.storage_path]);
    }
    const { error } = await supabase.from("project_artifacts").delete().eq("id", id);
    if (error) throw error;
  },
};

// ============================================================
// TAGS (typed: Skill / Technology / Domain)
// ============================================================
export const tagService = {
  async list(userId: string): Promise<Tag[]> {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .eq("user_id", userId)
      .order("type")
      .order("name");
    if (error) throw error;
    return data ?? [];
  },

  async listForProject(projectId: string): Promise<Tag[]> {
    const { data, error } = await supabase
      .from("project_tags")
      .select("tags(*)")
      .eq("project_id", projectId);
    if (error) throw error;
    return (data ?? []).flatMap((row) => (row.tags ? [row.tags as unknown as Tag] : []));
  },

  async getOrCreate(userId: string, name: string, type: TagType): Promise<Tag> {
    const trimmed = name.trim();
    const { data, error } = await supabase
      .from("tags")
      .upsert({ user_id: userId, name: trimmed, type } satisfies TagInsert, {
        onConflict: "user_id,name,type",
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async attachToProject(projectId: string, tagId: string): Promise<void> {
    const { error } = await supabase
      .from("project_tags")
      .upsert({ project_id: projectId, tag_id: tagId }, { onConflict: "project_id,tag_id" });
    if (error) throw error;
  },

  async detachFromProject(projectId: string, tagId: string): Promise<void> {
    const { error } = await supabase
      .from("project_tags")
      .delete()
      .eq("project_id", projectId)
      .eq("tag_id", tagId);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("tags").delete().eq("id", id);
    if (error) throw error;
  },
};

// ============================================================
// PROJECT READINESS
// ============================================================
export interface ProjectReadiness {
  score: number; // 0-100
  stage: "draft" | "in_progress" | "portfolio_ready";
  stageLabel: string;
  missing: string[];
}

// Section completion + artifact richness, per PRD §7.
export function calculateProjectReadiness(
  project: Project,
  counts: { milestones: number; artifacts: number; tags: number },
): ProjectReadiness {
  const checks: { label: string; done: boolean; weight: number }[] = [
    { label: "Cover image", done: !!project.cover_image_url, weight: 8 },
    { label: "Summary", done: project.summary.trim().length > 0, weight: 12 },
    { label: "Problem & objectives", done: project.problem.trim().length > 0, weight: 14 },
    { label: "Solution & process", done: project.action.trim().length > 0, weight: 14 },
    { label: "Milestones", done: counts.milestones > 0, weight: 10 },
    { label: "Results & metrics", done: project.result.trim().length > 0, weight: 14 },
    {
      label: "Skills & technologies",
      done: counts.tags > 0 || project.skills.length > 0,
      weight: 10,
    },
    { label: "Artifacts", done: counts.artifacts > 0, weight: 12 },
    { label: "Reflection", done: project.reflection.trim().length > 0, weight: 6 },
  ];
  const score = Math.round(checks.reduce((sum, c) => sum + (c.done ? c.weight : 0), 0));
  const missing = checks.filter((c) => !c.done).map((c) => c.label);

  let stage: ProjectReadiness["stage"] = "draft";
  let stageLabel = "Draft";
  if (score >= 80) {
    stage = "portfolio_ready";
    stageLabel = "Portfolio-ready";
  } else if (score >= 35) {
    stage = "in_progress";
    stageLabel = "Case study in progress";
  }

  return { score, stage, stageLabel, missing };
}

// ============================================================
// ONBOARDING DRAFT
// ============================================================
export const onboardingService = {
  async getDraft(userId: string): Promise<OnboardingDraft | null> {
    const { data, error } = await supabase
      .from("onboarding_drafts")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async saveDraft(userId: string, updates: OnboardingDraftUpdate): Promise<OnboardingDraft> {
    const { data, error } = await supabase
      .from("onboarding_drafts")
      .upsert({ user_id: userId, ...updates }, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async complete(
    userId: string,
    profileData: ProfileUpdate,
    firstProject?: object | null,
    firstExperience?: object | null,
  ): Promise<void> {
    // Update profile
    await profileService.update(userId, {
      ...profileData,
      onboarding_completed: true,
      onboarding_step: 3,
    });

    // Insert first project if provided
    if (firstProject && typeof firstProject === "object" && "title" in firstProject) {
      const p = firstProject as {
        title: string;
        problem: string;
        action: string;
        result: string;
      };
      if (p.title && p.problem && p.action && p.result) {
        await projectService.create({
          user_id: userId,
          title: p.title,
          problem: p.problem,
          action: p.action,
          result: p.result,
          type: "Personal Project",
          date: String(new Date().getFullYear()),
          start_year: new Date().getFullYear(),
        });
      }
    }

    // Insert first experience if provided
    if (firstExperience && typeof firstExperience === "object" && "org" in firstExperience) {
      const e = firstExperience as {
        org: string;
        role: string;
        start_date?: string;
        end_date?: string;
        bullets?: string;
      };
      if (e.org && e.role) {
        const bullets = e.bullets ? [e.bullets] : [];
        await experienceService.create({
          user_id: userId,
          org: e.org,
          role: e.role,
          start_date: e.start_date ?? "",
          end_date: e.end_date ?? "",
          bullets,
          type: "Internship",
        });
      }
    }
  },
};

// ============================================================
// PROFILE COMPLETION CALCULATOR
// ============================================================
export function calculateProfileCompletion(
  profile: Profile | null,
  counts: {
    projects: number;
    experience: number;
    education: number;
    achievements: number;
    skills: number;
  },
): number {
  if (!profile) return 0;
  let score = 0;
  const max = 100;

  // Basic profile fields: 40 points
  if (profile.name) score += 8;
  if (profile.school) score += 8;
  if (profile.program) score += 6;
  if (profile.goal) score += 10;
  if (profile.location) score += 4;
  if (profile.avatar_url) score += 4;

  // Content sections: 60 points
  if (counts.projects >= 1) score += 12;
  if (counts.projects >= 2) score += 6;
  if (counts.experience >= 1) score += 12;
  if (counts.experience >= 2) score += 6;
  if (counts.education >= 1) score += 10;
  if (counts.achievements >= 1) score += 8;
  if (counts.skills >= 3) score += 6;

  return Math.min(Math.round(score), max);
}
