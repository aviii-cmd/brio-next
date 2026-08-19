import { supabase } from "@/lib/supabase";
import type {
  Opportunity,
  OpportunityView,
  SavedOpportunity,
  Application,
  ApplicationChecklistItem,
  OpportunityCollection,
  OpportunityCollectionItem,
  OpportunityCollectionWithItems,
  RecommendedOpportunity,
  OpportunityCategory,
  OpportunityDifficulty,
  LocationType,
  CostType,
  CareerTrack,
  PrestigeLevel,
  ApplicationStatus,
  OpportunityFeedbackValue,
} from "@/types/database";

// ============================================================
// OPPORTUNITIES (catalog: search, facets, pagination)
// ============================================================
export interface OpportunityFilters {
  query?: string;
  categories?: OpportunityCategory[];
  locationTypes?: LocationType[];
  countries?: string[];
  costTypes?: CostType[];
  difficulties?: OpportunityDifficulty[];
  careerTracks?: CareerTrack[];
  prestigeLevels?: PrestigeLevel[];
  /** Only opportunities with a fixed deadline within the next N days. */
  maxDeadlineDays?: number | null;
}

export interface OpportunityPage {
  items: Opportunity[];
  hasMore: boolean;
  total: number | null;
}

const PAGE_SIZE = 24;

// Every facet is a plain indexed-column filter (see 003_stage3_discover.sql),
// so this stays a single fast query even as the catalog grows — no
// client-side filtering of a large fetched set.
export const opportunityService = {
  async search(filters: OpportunityFilters, page = 0): Promise<OpportunityPage> {
    let q = supabase.from("opportunities").select("*", { count: "exact" }).eq("is_active", true);

    if (filters.query?.trim()) {
      q = q.textSearch("search_vector", filters.query.trim(), {
        type: "websearch",
        config: "english",
      });
    }
    if (filters.categories?.length) q = q.in("category", filters.categories);
    if (filters.locationTypes?.length) q = q.in("location_type", filters.locationTypes);
    if (filters.countries?.length) q = q.in("country", filters.countries);
    if (filters.costTypes?.length) q = q.in("cost_type", filters.costTypes);
    if (filters.difficulties?.length) q = q.in("difficulty", filters.difficulties);
    if (filters.careerTracks?.length) q = q.in("career_track", filters.careerTracks);
    if (filters.prestigeLevels?.length) q = q.in("prestige_level", filters.prestigeLevels);
    if (filters.maxDeadlineDays != null) {
      const cutoff = new Date(Date.now() + filters.maxDeadlineDays * 86_400_000).toISOString();
      q = q
        .eq("rolling_deadline", false)
        .not("application_deadline", "is", null)
        .lte("application_deadline", cutoff);
    }

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error, count } = await q
      .order("rolling_deadline", { ascending: true })
      .order("application_deadline", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true })
      .range(from, to);

    if (error) throw error;
    const items = data ?? [];
    const total = count ?? null;
    const hasMore = total != null ? to + 1 < total : items.length === PAGE_SIZE;
    return { items, hasMore, total };
  },

  async getById(id: string): Promise<Opportunity> {
    const { data, error } = await supabase.from("opportunities").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  },

  async getManyByIds(ids: string[]): Promise<Opportunity[]> {
    if (ids.length === 0) return [];
    const { data, error } = await supabase.from("opportunities").select("*").in("id", ids);
    if (error) throw error;
    return data ?? [];
  },

  async listClosingSoon(days = 14, limit = 12): Promise<Opportunity[]> {
    const cutoff = new Date(Date.now() + days * 86_400_000).toISOString();
    const { data, error } = await supabase
      .from("opportunities")
      .select("*")
      .eq("is_active", true)
      .eq("rolling_deadline", false)
      .not("application_deadline", "is", null)
      .gt("application_deadline", new Date().toISOString())
      .lte("application_deadline", cutoff)
      .order("application_deadline", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  /** Distinct country/category facet values actually present, for filter chips. */
  async listDistinctCountries(): Promise<string[]> {
    const { data, error } = await supabase
      .from("opportunities")
      .select("country")
      .eq("is_active", true)
      .not("country", "is", null);
    if (error) throw error;
    return Array.from(
      new Set((data ?? []).map((r) => r.country).filter((c): c is string => Boolean(c))),
    ).sort();
  },
};

// ============================================================
// RECOMMENDATION ENGINE (client wrapper around the SQL function)
// ============================================================
// All scoring happens in public.recommend_opportunities() — this just
// hydrates the returned ids into full Opportunity rows and formats the
// explainability arrays. See migration 003 for the scoring logic itself.
export const recommendationService = {
  async getForUser(userId: string, limit = 24): Promise<RecommendedOpportunity[]> {
    const { data: rows, error } = await supabase.rpc("recommend_opportunities", {
      p_user_id: userId,
      p_limit: limit,
    });
    if (error) throw error;
    if (!rows || rows.length === 0) return [];

    const ids = rows.map((r) => r.opportunity_id);
    const opportunities = await opportunityService.getManyByIds(ids);
    const byId = new Map(opportunities.map((o) => [o.id, o]));

    return rows
      .map((r): RecommendedOpportunity | null => {
        const opp = byId.get(r.opportunity_id);
        if (!opp) return null;
        return {
          ...opp,
          score: r.score,
          matchedSkills: r.matched_skills ?? [],
          matchedTags: r.matched_tags ?? [],
          isExploration: r.is_exploration,
        };
      })
      .filter((x): x is RecommendedOpportunity => x !== null);
  },
};

// ============================================================
// VIEWS (behavioral signal + "Continue Exploring")
// ============================================================
export const opportunityViewService = {
  async logView(userId: string, opportunityId: string): Promise<void> {
    const { error } = await supabase.rpc("log_opportunity_view", {
      p_user_id: userId,
      p_opportunity_id: opportunityId,
    });
    if (error) throw error;
  },

  async listRecent(userId: string, limit = 12): Promise<OpportunityView[]> {
    const { data, error } = await supabase
      .from("opportunity_views")
      .select("*")
      .eq("user_id", userId)
      .order("viewed_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },
};

// ============================================================
// SAVED OPPORTUNITIES
// ============================================================
export const savedOpportunityService = {
  async list(userId: string): Promise<SavedOpportunity[]> {
    const { data, error } = await supabase
      .from("saved_opportunities")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async save(userId: string, opportunityId: string, note = ""): Promise<SavedOpportunity> {
    const { data, error } = await supabase
      .from("saved_opportunities")
      .upsert(
        { user_id: userId, opportunity_id: opportunityId, note },
        { onConflict: "user_id,opportunity_id" },
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async unsave(userId: string, opportunityId: string): Promise<void> {
    const { error } = await supabase
      .from("saved_opportunities")
      .delete()
      .eq("user_id", userId)
      .eq("opportunity_id", opportunityId);
    if (error) throw error;
  },

  async updateNote(userId: string, opportunityId: string, note: string): Promise<SavedOpportunity> {
    const { data, error } = await supabase
      .from("saved_opportunities")
      .update({ note })
      .eq("user_id", userId)
      .eq("opportunity_id", opportunityId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// ============================================================
// FEEDBACK ("Not relevant" / interested — behavioral signal)
// ============================================================
export const opportunityFeedbackService = {
  async submit(
    userId: string,
    opportunityId: string,
    feedback: OpportunityFeedbackValue,
  ): Promise<void> {
    const { error } = await supabase
      .from("opportunity_feedback")
      .upsert(
        { user_id: userId, opportunity_id: opportunityId, feedback },
        { onConflict: "user_id,opportunity_id" },
      );
    if (error) throw error;
  },

  async remove(userId: string, opportunityId: string): Promise<void> {
    const { error } = await supabase
      .from("opportunity_feedback")
      .delete()
      .eq("user_id", userId)
      .eq("opportunity_id", opportunityId);
    if (error) throw error;
  },
};

// ============================================================
// APPLICATION TRACKER
// ============================================================
export const applicationService = {
  async list(userId: string): Promise<Application[]> {
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getForOpportunity(userId: string, opportunityId: string): Promise<Application | null> {
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("user_id", userId)
      .eq("opportunity_id", opportunityId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // Auto-generates the checklist from the opportunity's application_steps
  // the first time (see public.create_application in migration 003).
  async create(
    userId: string,
    opportunityId: string,
    status: ApplicationStatus = "planning",
  ): Promise<Application> {
    const { data, error } = await supabase.rpc("create_application", {
      p_user_id: userId,
      p_opportunity_id: opportunityId,
      p_status: status,
    });
    if (error) throw error;
    return data as Application;
  },

  async updateStatus(id: string, status: ApplicationStatus): Promise<Application> {
    const { data, error } = await supabase
      .from("applications")
      .update({ status })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateNotes(id: string, notes: string): Promise<Application> {
    const { data, error } = await supabase
      .from("applications")
      .update({ notes })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async reorder(items: { id: string; sort_order: number }[]): Promise<void> {
    await Promise.all(
      items.map((i) =>
        supabase.from("applications").update({ sort_order: i.sort_order }).eq("id", i.id),
      ),
    );
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("applications").delete().eq("id", id);
    if (error) throw error;
  },
};

// ============================================================
// APPLICATION CHECKLIST ITEMS
// ============================================================
export const checklistService = {
  async listForApplications(applicationIds: string[]): Promise<ApplicationChecklistItem[]> {
    if (applicationIds.length === 0) return [];
    const { data, error } = await supabase
      .from("application_checklist_items")
      .select("*")
      .in("application_id", applicationIds)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async add(
    applicationId: string,
    item: { title: string; description?: string; due_date?: string | null; sort_order?: number },
  ): Promise<ApplicationChecklistItem> {
    const { data, error } = await supabase
      .from("application_checklist_items")
      .insert({ application_id: applicationId, ...item })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async toggle(id: string, isComplete: boolean): Promise<ApplicationChecklistItem> {
    const { data, error } = await supabase
      .from("application_checklist_items")
      .update({ is_complete: isComplete })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(
    id: string,
    updates: { title?: string; description?: string; due_date?: string | null },
  ): Promise<ApplicationChecklistItem> {
    const { data, error } = await supabase
      .from("application_checklist_items")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("application_checklist_items").delete().eq("id", id);
    if (error) throw error;
  },
};

// ============================================================
// THEMATIC COLLECTIONS
// ============================================================
export const collectionService = {
  async list(): Promise<OpportunityCollection[]> {
    const { data, error } = await supabase
      .from("opportunity_collections")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async listItems(collectionId: string): Promise<OpportunityCollectionItem[]> {
    const { data, error } = await supabase
      .from("opportunity_collection_items")
      .select("*")
      .eq("collection_id", collectionId)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  /** Collections with a preview of their opportunities, for Discover Home. */
  async listWithOpportunities(previewSize = 6): Promise<OpportunityCollectionWithItems[]> {
    const collections = await collectionService.list();
    if (collections.length === 0) return [];

    const { data: items, error } = await supabase
      .from("opportunity_collection_items")
      .select("*")
      .in(
        "collection_id",
        collections.map((c) => c.id),
      )
      .order("sort_order", { ascending: true });
    if (error) throw error;

    const oppIds = Array.from(new Set((items ?? []).map((i) => i.opportunity_id)));
    const opportunities = await opportunityService.getManyByIds(oppIds);
    const oppById = new Map(opportunities.map((o) => [o.id, o]));

    return collections.map((c) => ({
      ...c,
      opportunities: (items ?? [])
        .filter((i) => i.collection_id === c.id)
        .map((i) => oppById.get(i.opportunity_id))
        .filter((o): o is Opportunity => Boolean(o))
        .slice(0, previewSize),
    }));
  },
};
