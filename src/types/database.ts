export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type AchievementLevel = "School" | "Regional" | "National" | "International";
export type SkillCategory = "Technical" | "Tools" | "Soft";
export type ProjectStatus = "draft" | "published" | "archived";
export type ProjectTaskStatus = "todo" | "in_progress" | "blocked" | "review" | "done";
export type ProjectTaskPriority = "low" | "medium" | "high";
export type ArtifactKind = "image" | "video" | "file" | "link";
export type TagType = "skill" | "tech" | "domain";

// --- Stage 3: Discover ---
export type AcademicLevel =
  | "Grade 9"
  | "Grade 10"
  | "Grade 11"
  | "Grade 12"
  | "Undergraduate Year 1"
  | "Undergraduate Year 2"
  | "Undergraduate Year 3"
  | "Undergraduate Year 4"
  | "Graduate / Postgraduate";
export type OpportunityCategory =
  | "Competition"
  | "Internship"
  | "Fellowship"
  | "Scholarship"
  | "Research Program"
  | "Hackathon"
  | "Volunteering"
  | "Course"
  | "Grant"
  | "Mentorship"
  | "Other";
export type OpportunityDifficulty = "Beginner" | "Intermediate" | "Advanced";
// Prestige reuses the exact vocabulary of AchievementLevel so a student's own
// achievements and an opportunity's prestige are directly comparable.
export type PrestigeLevel = AchievementLevel;
export type CostType = "Free" | "Stipend" | "Paid" | "Fee-required";
export type LocationType = "Remote" | "Onsite" | "Hybrid";
export type CareerTrack =
  "Founder" | "Researcher" | "Engineer" | "Creative" | "Analyst" | "Leader" | "Advocate";
export type ApplicationStatus =
  "planning" | "preparing" | "applied" | "interview" | "accepted" | "rejected" | "completed";
export type OpportunityFeedbackValue = "not_relevant" | "interested";
export interface EligibilityRequirement {
  label: string;
  value: string;
}
export interface ApplicationStep {
  title: string;
  description: string;
}
export interface PreparationResource {
  title: string;
  url: string;
  type: "past_winner" | "mooc" | "guide" | "showcase" | "other";
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          initials: string;
          email: string | null;
          school: string;
          program: string;
          graduation_year: string;
          location: string;
          goal: string;
          intent: string;
          avatar_url: string | null;
          onboarding_completed: boolean;
          onboarding_step: number;
          onboarding_intent: string | null;
          is_public: boolean;
          show_in_search: boolean;
          allow_resume_requests: boolean;
          academic_level: AcademicLevel | null;
          academic_level_rank: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string;
          email?: string | null;
          school?: string;
          program?: string;
          graduation_year?: string;
          location?: string;
          goal?: string;
          intent?: string;
          avatar_url?: string | null;
          onboarding_completed?: boolean;
          onboarding_step?: number;
          onboarding_intent?: string | null;
          is_public?: boolean;
          show_in_search?: boolean;
          allow_resume_requests?: boolean;
          academic_level?: AcademicLevel | null;
        };
        Update: {
          name?: string;
          email?: string | null;
          school?: string;
          program?: string;
          graduation_year?: string;
          location?: string;
          goal?: string;
          intent?: string;
          avatar_url?: string | null;
          onboarding_completed?: boolean;
          onboarding_step?: number;
          onboarding_intent?: string | null;
          is_public?: boolean;
          show_in_search?: boolean;
          allow_resume_requests?: boolean;
          academic_level?: AcademicLevel | null;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          type: string;
          date: string;
          start_year: number | null;
          url: string | null;
          featured: boolean;
          problem: string;
          action: string;
          result: string;
          skills: string[];
          role: string;
          sort_order: number;
          status: ProjectStatus;
          summary: string;
          constraints: string;
          reflection: string;
          cover_image_url: string | null;
          template: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          type?: string;
          date?: string;
          start_year?: number | null;
          url?: string | null;
          featured?: boolean;
          problem?: string;
          action?: string;
          result?: string;
          skills?: string[];
          role?: string;
          sort_order?: number;
          status?: ProjectStatus;
          summary?: string;
          constraints?: string;
          reflection?: string;
          cover_image_url?: string | null;
          template?: string | null;
          published_at?: string | null;
        };
        Update: {
          title?: string;
          type?: string;
          date?: string;
          start_year?: number | null;
          url?: string | null;
          featured?: boolean;
          problem?: string;
          action?: string;
          result?: string;
          skills?: string[];
          role?: string;
          sort_order?: number;
          status?: ProjectStatus;
          summary?: string;
          constraints?: string;
          reflection?: string;
          cover_image_url?: string | null;
          template?: string | null;
          published_at?: string | null;
        };
        Relationships: [];
      };
      project_milestones: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string;
          milestone_date: string;
          outcome: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          description?: string;
          milestone_date?: string;
          outcome?: string;
          sort_order?: number;
        };
        Update: {
          title?: string;
          description?: string;
          milestone_date?: string;
          outcome?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      project_tasks: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          title: string;
          description: string;
          status: ProjectTaskStatus;
          priority: ProjectTaskPriority;
          due_date: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          title: string;
          description?: string;
          status?: ProjectTaskStatus;
          priority?: ProjectTaskPriority;
          due_date?: string | null;
          sort_order?: number;
        };
        Update: {
          title?: string;
          description?: string;
          status?: ProjectTaskStatus;
          priority?: ProjectTaskPriority;
          due_date?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      project_artifacts: {
        Row: {
          id: string;
          project_id: string;
          kind: ArtifactKind;
          category: string;
          url: string;
          storage_path: string | null;
          caption: string;
          file_name: string | null;
          file_size: number | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          kind?: ArtifactKind;
          category?: string;
          url: string;
          storage_path?: string | null;
          caption?: string;
          file_name?: string | null;
          file_size?: number | null;
          sort_order?: number;
        };
        Update: {
          kind?: ArtifactKind;
          category?: string;
          url?: string;
          storage_path?: string | null;
          caption?: string;
          file_name?: string | null;
          file_size?: number | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: TagType;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type?: TagType;
        };
        Update: {
          name?: string;
          type?: TagType;
        };
        Relationships: [];
      };
      project_tags: {
        Row: {
          project_id: string;
          tag_id: string;
          created_at: string;
        };
        Insert: {
          project_id: string;
          tag_id: string;
        };
        Update: {
          project_id?: string;
          tag_id?: string;
        };
        Relationships: [];
      };
      experience: {
        Row: {
          id: string;
          user_id: string;
          org: string;
          role: string;
          type: string;
          start_date: string;
          end_date: string;
          is_current: boolean;
          location: string;
          bullets: string[];
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          org: string;
          role: string;
          type?: string;
          start_date?: string;
          end_date?: string;
          is_current?: boolean;
          location?: string;
          bullets?: string[];
          sort_order?: number;
        };
        Update: {
          org?: string;
          role?: string;
          type?: string;
          start_date?: string;
          end_date?: string;
          is_current?: boolean;
          location?: string;
          bullets?: string[];
          sort_order?: number;
        };
        Relationships: [];
      };
      education: {
        Row: {
          id: string;
          user_id: string;
          institution: string;
          program: string;
          field: string;
          start_year: string;
          end_year: string;
          gpa: string | null;
          coursework: string[];
          is_current: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          institution: string;
          program: string;
          field?: string;
          start_year?: string;
          end_year?: string;
          gpa?: string | null;
          coursework?: string[];
          is_current?: boolean;
          sort_order?: number;
        };
        Update: {
          institution?: string;
          program?: string;
          field?: string;
          start_year?: string;
          end_year?: string;
          gpa?: string | null;
          coursework?: string[];
          is_current?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      achievements: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          issuer: string;
          year: number;
          level: AchievementLevel;
          description: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          issuer: string;
          year: number;
          level?: AchievementLevel;
          description?: string | null;
          sort_order?: number;
        };
        Update: {
          name?: string;
          issuer?: string;
          year?: number;
          level?: AchievementLevel;
          description?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      skills: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: SkillCategory;
          source: string;
          linked_to: string[];
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          category?: SkillCategory;
          source?: string;
          linked_to?: string[];
          sort_order?: number;
        };
        Update: {
          name?: string;
          category?: SkillCategory;
          source?: string;
          linked_to?: string[];
          sort_order?: number;
        };
        Relationships: [];
      };
      onboarding_drafts: {
        Row: {
          id: string;
          user_id: string;
          step: number;
          intent: string | null;
          name: string | null;
          school: string | null;
          graduation_year: string | null;
          goal: string | null;
          first_project: Json | null;
          first_experience: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          step?: number;
          intent?: string | null;
          name?: string | null;
          school?: string | null;
          graduation_year?: string | null;
          goal?: string | null;
          first_project?: Json | null;
          first_experience?: Json | null;
        };
        Update: {
          step?: number;
          intent?: string | null;
          name?: string | null;
          school?: string | null;
          graduation_year?: string | null;
          goal?: string | null;
          first_project?: Json | null;
          first_experience?: Json | null;
        };
        Relationships: [];
      };
      opportunities: {
        Row: {
          id: string;
          title: string;
          organization: string;
          category: OpportunityCategory;
          summary: string;
          description: string;
          why_it_matters: string;
          difficulty: OpportunityDifficulty;
          prestige_level: PrestigeLevel;
          career_impact_score: number | null;
          cost_type: CostType;
          time_commitment: string;
          duration: string;
          location_type: LocationType;
          country: string | null;
          city: string | null;
          career_track: CareerTrack | null;
          eligibility_grade_min: number | null;
          eligibility_grade_max: number | null;
          eligibility_requirements: EligibilityRequirement[];
          application_steps: ApplicationStep[];
          preparation_resources: PreparationResource[];
          required_skills: string[];
          tags: string[];
          application_url: string | null;
          application_deadline: string | null;
          rolling_deadline: boolean;
          saves_count: number;
          views_count: number;
          is_active: boolean;
          source: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          organization: string;
          category?: OpportunityCategory;
          summary?: string;
          description?: string;
          why_it_matters?: string;
          difficulty?: OpportunityDifficulty;
          prestige_level?: PrestigeLevel;
          career_impact_score?: number | null;
          cost_type?: CostType;
          time_commitment?: string;
          duration?: string;
          location_type?: LocationType;
          country?: string | null;
          city?: string | null;
          career_track?: CareerTrack | null;
          eligibility_grade_min?: number | null;
          eligibility_grade_max?: number | null;
          eligibility_requirements?: Json;
          application_steps?: Json;
          preparation_resources?: Json;
          required_skills?: string[];
          tags?: string[];
          application_url?: string | null;
          application_deadline?: string | null;
          rolling_deadline?: boolean;
          is_active?: boolean;
          source?: string;
        };
        Update: {
          title?: string;
          organization?: string;
          category?: OpportunityCategory;
          summary?: string;
          description?: string;
          why_it_matters?: string;
          difficulty?: OpportunityDifficulty;
          prestige_level?: PrestigeLevel;
          career_impact_score?: number | null;
          cost_type?: CostType;
          time_commitment?: string;
          duration?: string;
          location_type?: LocationType;
          country?: string | null;
          city?: string | null;
          career_track?: CareerTrack | null;
          eligibility_grade_min?: number | null;
          eligibility_grade_max?: number | null;
          eligibility_requirements?: Json;
          application_steps?: Json;
          preparation_resources?: Json;
          required_skills?: string[];
          tags?: string[];
          application_url?: string | null;
          application_deadline?: string | null;
          rolling_deadline?: boolean;
          is_active?: boolean;
          source?: string;
        };
        Relationships: [];
      };
      opportunity_views: {
        Row: {
          id: string;
          user_id: string;
          opportunity_id: string;
          viewed_at: string;
          view_count: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          opportunity_id: string;
          viewed_at?: string;
          view_count?: number;
        };
        Update: {
          viewed_at?: string;
          view_count?: number;
        };
        Relationships: [];
      };
      saved_opportunities: {
        Row: {
          id: string;
          user_id: string;
          opportunity_id: string;
          note: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          opportunity_id: string;
          note?: string;
        };
        Update: {
          note?: string;
        };
        Relationships: [];
      };
      opportunity_feedback: {
        Row: {
          id: string;
          user_id: string;
          opportunity_id: string;
          feedback: OpportunityFeedbackValue;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          opportunity_id: string;
          feedback: OpportunityFeedbackValue;
        };
        Update: {
          feedback?: OpportunityFeedbackValue;
        };
        Relationships: [];
      };
      applications: {
        Row: {
          id: string;
          user_id: string;
          opportunity_id: string;
          status: ApplicationStatus;
          notes: string;
          sort_order: number;
          applied_at: string | null;
          decision_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          opportunity_id: string;
          status?: ApplicationStatus;
          notes?: string;
          sort_order?: number;
        };
        Update: {
          status?: ApplicationStatus;
          notes?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      application_checklist_items: {
        Row: {
          id: string;
          application_id: string;
          title: string;
          description: string;
          is_complete: boolean;
          due_date: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          title: string;
          description?: string;
          is_complete?: boolean;
          due_date?: string | null;
          sort_order?: number;
        };
        Update: {
          title?: string;
          description?: string;
          is_complete?: boolean;
          due_date?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      opportunity_collections: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string;
          icon: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description?: string;
          icon?: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: {
          title?: string;
          description?: string;
          icon?: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      opportunity_collection_items: {
        Row: {
          collection_id: string;
          opportunity_id: string;
          sort_order: number;
        };
        Insert: {
          collection_id: string;
          opportunity_id: string;
          sort_order?: number;
        };
        Update: {
          sort_order?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      recommend_opportunities: {
        Args: { p_user_id: string; p_limit?: number };
        Returns: {
          opportunity_id: string;
          score: number;
          matched_skills: string[];
          matched_tags: string[];
          is_exploration: boolean;
        }[];
      };
      log_opportunity_view: {
        Args: { p_user_id: string; p_opportunity_id: string };
        Returns: undefined;
      };
      create_application: {
        Args: { p_user_id: string; p_opportunity_id: string; p_status?: string };
        Returns: Database["public"]["Tables"]["applications"]["Row"];
      };
    };
    Enums: {
      achievement_level: AchievementLevel;
      skill_category: SkillCategory;
      project_status: ProjectStatus;
      artifact_kind: ArtifactKind;
      tag_type: TagType;
      opportunity_category: OpportunityCategory;
      application_status: ApplicationStatus;
    };
  };
}

// Convenience row types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
export type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];
export type ProjectTask = Database["public"]["Tables"]["project_tasks"]["Row"];
export type ProjectTaskInsert = Database["public"]["Tables"]["project_tasks"]["Insert"];
export type ProjectTaskUpdate = Database["public"]["Tables"]["project_tasks"]["Update"];
export type Experience = Database["public"]["Tables"]["experience"]["Row"];
export type ExperienceInsert = Database["public"]["Tables"]["experience"]["Insert"];
export type ExperienceUpdate = Database["public"]["Tables"]["experience"]["Update"];
export type Education = Database["public"]["Tables"]["education"]["Row"];
export type EducationInsert = Database["public"]["Tables"]["education"]["Insert"];
export type EducationUpdate = Database["public"]["Tables"]["education"]["Update"];
export type Achievement = Database["public"]["Tables"]["achievements"]["Row"];
export type AchievementInsert = Database["public"]["Tables"]["achievements"]["Insert"];
export type AchievementUpdate = Database["public"]["Tables"]["achievements"]["Update"];
export type Skill = Database["public"]["Tables"]["skills"]["Row"];
export type SkillInsert = Database["public"]["Tables"]["skills"]["Insert"];
export type OnboardingDraft = Database["public"]["Tables"]["onboarding_drafts"]["Row"];
export type OnboardingDraftUpdate = Database["public"]["Tables"]["onboarding_drafts"]["Update"];
export type ProjectMilestone = Database["public"]["Tables"]["project_milestones"]["Row"];
export type ProjectMilestoneInsert = Database["public"]["Tables"]["project_milestones"]["Insert"];
export type ProjectMilestoneUpdate = Database["public"]["Tables"]["project_milestones"]["Update"];
export type ProjectArtifact = Database["public"]["Tables"]["project_artifacts"]["Row"];
export type ProjectArtifactInsert = Database["public"]["Tables"]["project_artifacts"]["Insert"];
export type ProjectArtifactUpdate = Database["public"]["Tables"]["project_artifacts"]["Update"];
export type Tag = Database["public"]["Tables"]["tags"]["Row"];
export type TagInsert = Database["public"]["Tables"]["tags"]["Insert"];
export type ProjectTag = Database["public"]["Tables"]["project_tags"]["Row"];

// Convenience shape for call sites that want a project with its related
// rows assembled client-side (the hooks fetch these separately, not via
// a single joined query).
export type ProjectWithRelations = Project & {
  milestones: ProjectMilestone[];
  artifacts: ProjectArtifact[];
  tags: Tag[];
};

// --- Stage 3: Discover convenience types ---
export type Opportunity = Database["public"]["Tables"]["opportunities"]["Row"];
export type OpportunityView = Database["public"]["Tables"]["opportunity_views"]["Row"];
export type SavedOpportunity = Database["public"]["Tables"]["saved_opportunities"]["Row"];
export type OpportunityFeedback = Database["public"]["Tables"]["opportunity_feedback"]["Row"];
export type Application = Database["public"]["Tables"]["applications"]["Row"];
export type ApplicationInsert = Database["public"]["Tables"]["applications"]["Insert"];
export type ApplicationChecklistItem =
  Database["public"]["Tables"]["application_checklist_items"]["Row"];
export type OpportunityCollection = Database["public"]["Tables"]["opportunity_collections"]["Row"];
export type OpportunityCollectionItem =
  Database["public"]["Tables"]["opportunity_collection_items"]["Row"];
export type RecommendationRow =
  Database["public"]["Functions"]["recommend_opportunities"]["Returns"][number];

// A recommendation joined with its opportunity, as assembled client-side by
// recommendationService (see src/services/discover.ts) after the RPC call.
export type RecommendedOpportunity = Opportunity & {
  score: number;
  matchedSkills: string[];
  matchedTags: string[];
  isExploration: boolean;
};

// An application joined with its opportunity, the shape the Tracker board
// and Discover Home actually render.
export type ApplicationWithOpportunity = Application & {
  opportunity: Opportunity;
  checklist: ApplicationChecklistItem[];
};

export type SavedOpportunityWithDetails = SavedOpportunity & { opportunity: Opportunity };

export type OpportunityCollectionWithItems = OpportunityCollection & {
  opportunities: Opportunity[];
};

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "planning",
  "preparing",
  "applied",
  "interview",
  "accepted",
  "rejected",
  "completed",
];

export const ACADEMIC_LEVELS: AcademicLevel[] = [
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
  "Undergraduate Year 1",
  "Undergraduate Year 2",
  "Undergraduate Year 3",
  "Undergraduate Year 4",
  "Graduate / Postgraduate",
];

export const OPPORTUNITY_CATEGORIES: OpportunityCategory[] = [
  "Competition",
  "Internship",
  "Fellowship",
  "Scholarship",
  "Research Program",
  "Hackathon",
  "Volunteering",
  "Course",
  "Grant",
  "Mentorship",
  "Other",
];
