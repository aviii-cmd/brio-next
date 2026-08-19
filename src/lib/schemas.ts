import { z } from "zod";

// ============================================================
// AUTH
// ============================================================
export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ============================================================
// PROFILE
// ============================================================
export const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  school: z.string().max(200).optional().default(""),
  program: z.string().max(200).optional().default(""),
  graduation_year: z.string().max(10).optional().default(""),
  location: z.string().max(200).optional().default(""),
  goal: z.string().max(500).optional().default(""),
  intent: z.string().max(100).optional().default(""),
  // Powers Discover's grade-eligibility matching; "" means not set yet.
  academic_level: z.string().max(50).optional().default(""),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

// ============================================================
// PROJECTS
// ============================================================
export const projectSchema = z.object({
  title: z.string().min(1, "Project title is required").max(200),
  type: z.enum([
    "Course Project",
    "Personal Project",
    "Club",
    "Research",
    "Freelance",
    "Open Source",
    "Other",
  ]),
  date: z.string().max(20).optional().default(""),
  url: z
    .string()
    .optional()
    .refine((v) => !v || /^https?:\/\/.+/.test(v), "Must be a valid URL")
    .default(""),
  featured: z.boolean().optional().default(false),
  problem: z.string().min(1, "Problem description is required").max(2000),
  action: z.string().min(1, "Action description is required").max(2000),
  result: z.string().min(1, "Result description is required").max(2000),
  skills: z.array(z.string().max(60)).max(20).optional().default([]),
  role: z.string().max(200).optional().default(""),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;

// ============================================================
// PROJECTS — STAGE 2 (Projects Workspace)
// ============================================================
export const PROJECT_TYPES = [
  "Course Project",
  "Personal Project",
  "Club",
  "Research",
  "Freelance",
  "Open Source",
  "Other",
] as const;

export const PROJECT_TEMPLATES = [
  { value: "blank", label: "Blank project" },
  { value: "hackathon", label: "Hackathon" },
  { value: "internship", label: "Internship" },
  { value: "course", label: "Course project" },
  { value: "research", label: "Research" },
] as const;

// Creation only requires the bare minimum per PRD 5.1 — everything else
// is filled in inline on the project page afterward.
export const projectCreateSchema = z.object({
  title: z.string().min(1, "Project title is required").max(200),
  type: z.enum(PROJECT_TYPES).default("Personal Project"),
  role: z.string().max(200).optional().default(""),
  summary: z.string().max(400).optional().default(""),
  template: z.string().optional().default("blank"),
});
export type ProjectCreateValues = z.infer<typeof projectCreateSchema>;

// Individual inline-editable fields on the project page. Each field is
// validated independently so a single autosave request never blocks on
// unrelated sections.
export const projectFieldSchemas = {
  title: z.string().min(1, "Title is required").max(200),
  role: z.string().max(200),
  type: z.enum(PROJECT_TYPES),
  date: z.string().max(20),
  url: z.string().refine((v) => !v || /^https?:\/\/.+/.test(v), "Must be a valid URL"),
  summary: z.string().max(500, "Keep the summary to 2-3 sentences (under 500 characters)"),
  problem: z.string().max(3000),
  constraints: z.string().max(2000),
  action: z.string().max(4000),
  result: z.string().max(3000),
  reflection: z.string().max(2000),
  featured: z.boolean(),
};

export const milestoneSchema = z.object({
  title: z.string().min(1, "Milestone title is required").max(200),
  description: z.string().max(1000).optional().default(""),
  milestone_date: z.string().max(20).optional().default(""),
  outcome: z.string().max(500).optional().default(""),
});
export type MilestoneFormValues = z.infer<typeof milestoneSchema>;

export const artifactLinkSchema = z.object({
  url: z.string().refine((v) => /^https?:\/\/.+/.test(v), "Must be a valid URL"),
  category: z.string().max(60).optional().default("General"),
  caption: z.string().max(300).optional().default(""),
});
export type ArtifactLinkFormValues = z.infer<typeof artifactLinkSchema>;

export const tagSchema = z.object({
  name: z.string().min(1, "Tag name is required").max(60),
  type: z.enum(["skill", "tech", "domain"]).default("skill"),
});
export type TagFormValues = z.infer<typeof tagSchema>;

// ============================================================
// EXPERIENCE
// ============================================================
export const experienceSchema = z.object({
  org: z.string().min(1, "Organization is required").max(200),
  role: z.string().min(1, "Role is required").max(200),
  type: z.enum([
    "Internship",
    "Part-time",
    "Full-time",
    "Volunteer",
    "Research",
    "Freelance",
    "Other",
  ]),
  start_date: z.string().max(20).optional().default(""),
  end_date: z.string().max(20).optional().default(""),
  is_current: z.boolean().optional().default(false),
  location: z.string().max(200).optional().default(""),
  bullets: z.array(z.string().max(500)).max(10).optional().default([]),
});

export type ExperienceFormValues = z.infer<typeof experienceSchema>;

// ============================================================
// EDUCATION
// ============================================================
export const educationSchema = z.object({
  institution: z.string().min(1, "Institution is required").max(200),
  program: z.string().min(1, "Program is required").max(200),
  field: z.string().max(200).optional().default(""),
  start_year: z.string().max(10).optional().default(""),
  end_year: z.string().max(10).optional().default(""),
  gpa: z.string().max(10).optional().nullable().default(null),
  coursework: z.array(z.string().max(100)).max(20).optional().default([]),
  is_current: z.boolean().optional().default(false),
});

export type EducationFormValues = z.infer<typeof educationSchema>;

// ============================================================
// ACHIEVEMENTS
// ============================================================
export const achievementSchema = z.object({
  name: z.string().min(1, "Achievement name is required").max(200),
  issuer: z.string().min(1, "Issuing organization is required").max(200),
  year: z
    .number()
    .int()
    .min(1990)
    .max(new Date().getFullYear() + 2),
  level: z.enum(["School", "Regional", "National", "International"]),
  description: z.string().max(1000).optional().nullable().default(null),
});

export type AchievementFormValues = z.infer<typeof achievementSchema>;

// ============================================================
// ONBOARDING
// ============================================================
export const onboardingStep1Schema = z.object({
  intent: z.string().min(1, "Please select an option"),
});

export const onboardingStep2Schema = z.object({
  name: z.string().min(2, "Name is required").max(100),
  school: z.string().min(1, "Institution is required").max(200),
  graduation_year: z.string().min(1, "Graduation year is required").max(10),
  goal: z.string().max(500).optional().default(""),
});

export const onboardingProjectSchema = z.object({
  title: z.string().min(1, "Project title is required").max(200),
  problem: z.string().min(1, "Problem description is required").max(2000),
  action: z.string().min(1, "Action description is required").max(2000),
  result: z.string().min(1, "Result description is required").max(2000),
});

export const onboardingExperienceSchema = z.object({
  org: z.string().min(1, "Organization is required").max(200),
  role: z.string().min(1, "Role is required").max(200),
  start_date: z.string().optional().default(""),
  end_date: z.string().optional().default(""),
  bullets: z.string().max(500).optional().default(""),
});

// ============================================================
// SETTINGS
// ============================================================
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const privacySchema = z.object({
  is_public: z.boolean(),
  show_in_search: z.boolean(),
  allow_resume_requests: z.boolean(),
});

// ============================================================
// DISCOVER (Stage 3)
// ============================================================
export const checklistItemSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional().default(""),
  due_date: z.string().nullable().optional().default(null),
});
export type ChecklistItemFormValues = z.infer<typeof checklistItemSchema>;

export const applicationNotesSchema = z.object({
  notes: z.string().max(5000).optional().default(""),
});
export type ApplicationNotesFormValues = z.infer<typeof applicationNotesSchema>;

export const opportunityFeedbackSchema = z.object({
  feedback: z.enum(["not_relevant", "interested"]),
});
