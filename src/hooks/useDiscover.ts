import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  opportunityService,
  recommendationService,
  opportunityViewService,
  savedOpportunityService,
  opportunityFeedbackService,
  applicationService,
  checklistService,
  collectionService,
  type OpportunityFilters,
} from "@/services/discover";
import { queryKeys as profileQueryKeys } from "@/hooks/useData";
import type {
  Opportunity,
  Application,
  ApplicationChecklistItem,
  ApplicationStatus,
  ApplicationWithOpportunity,
  SavedOpportunityWithDetails,
  OpportunityFeedbackValue,
} from "@/types/database";

// ============================================================
// QUERY KEYS
// ============================================================
export const discoverKeys = {
  recommendations: (userId: string, limit: number) =>
    ["discover-recommendations", userId, limit] as const,
  closingSoon: (days: number) => ["discover-closing-soon", days] as const,
  recentViews: (userId: string) => ["discover-recent-views", userId] as const,
  saved: (userId: string) => ["discover-saved", userId] as const,
  collections: () => ["discover-collections"] as const,
  search: (filters: OpportunityFilters) => ["discover-search", filters] as const,
  opportunity: (id: string) => ["discover-opportunity", id] as const,
  opportunitiesByIds: (ids: string[]) =>
    ["discover-opportunities-by-ids", [...ids].sort().join(",")] as const,
  applications: (userId: string) => ["discover-applications", userId] as const,
  applicationFor: (userId: string, opportunityId: string) =>
    ["discover-application-for", userId, opportunityId] as const,
  checklist: (applicationIds: string[]) =>
    ["discover-checklist", [...applicationIds].sort().join(",")] as const,
  distinctCountries: () => ["discover-countries"] as const,
};

// ============================================================
// DISCOVER HOME
// ============================================================
export function useRecommendations(userId: string | undefined, limit = 24) {
  return useQuery({
    queryKey: discoverKeys.recommendations(userId ?? "", limit),
    queryFn: () => recommendationService.getForUser(userId!, limit),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useClosingSoon(days = 14, limit = 12) {
  return useQuery({
    queryKey: discoverKeys.closingSoon(days),
    queryFn: () => opportunityService.listClosingSoon(days, limit),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCollections() {
  return useQuery({
    queryKey: discoverKeys.collections(),
    queryFn: () => collectionService.listWithOpportunities(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useDistinctCountries() {
  return useQuery({
    queryKey: discoverKeys.distinctCountries(),
    queryFn: () => opportunityService.listDistinctCountries(),
    staleTime: 30 * 60 * 1000,
  });
}

// ============================================================
// SAVED OPPORTUNITIES (hydrated with the opportunity itself)
// ============================================================
export function useSavedOpportunities(userId: string | undefined) {
  const savedQuery = useQuery({
    queryKey: discoverKeys.saved(userId ?? ""),
    queryFn: () => savedOpportunityService.list(userId!),
    enabled: !!userId,
  });

  const ids = useMemo(
    () => (savedQuery.data ?? []).map((s) => s.opportunity_id),
    [savedQuery.data],
  );
  const opportunitiesQuery = useQuery({
    queryKey: discoverKeys.opportunitiesByIds(ids),
    queryFn: () => opportunityService.getManyByIds(ids),
    enabled: ids.length > 0,
  });

  const data = useMemo<SavedOpportunityWithDetails[]>(() => {
    const oppById = new Map((opportunitiesQuery.data ?? []).map((o) => [o.id, o]));
    return (savedQuery.data ?? [])
      .map((s) => {
        const opportunity = oppById.get(s.opportunity_id);
        return opportunity ? { ...s, opportunity } : null;
      })
      .filter((x): x is SavedOpportunityWithDetails => x !== null);
  }, [savedQuery.data, opportunitiesQuery.data]);

  return {
    data,
    savedIds: new Set(ids),
    isLoading: savedQuery.isLoading || (ids.length > 0 && opportunitiesQuery.isLoading),
  };
}

export function useSaveOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      opportunityId,
      note,
    }: {
      userId: string;
      opportunityId: string;
      note?: string;
    }) => savedOpportunityService.save(userId, opportunityId, note),
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: discoverKeys.saved(userId) });
      toast.success("Saved to your list");
    },
    onError: () => toast.error("Couldn't save this opportunity"),
  });
}

export function useUnsaveOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, opportunityId }: { userId: string; opportunityId: string }) =>
      savedOpportunityService.unsave(userId, opportunityId),
    onMutate: async ({ userId, opportunityId }) => {
      await qc.cancelQueries({ queryKey: discoverKeys.saved(userId) });
      const prev = qc.getQueryData(discoverKeys.saved(userId));
      qc.setQueryData(discoverKeys.saved(userId), (old: typeof prev) =>
        Array.isArray(old)
          ? old.filter((s: { opportunity_id: string }) => s.opportunity_id !== opportunityId)
          : old,
      );
      return { prev, userId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) qc.setQueryData(discoverKeys.saved(ctx.userId), ctx.prev);
      toast.error("Couldn't remove this opportunity");
    },
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: discoverKeys.saved(userId) });
      toast.success("Removed from saved");
    },
  });
}

// ============================================================
// VIEWS ("Continue Exploring" + logging)
// ============================================================
export function useLogOpportunityView() {
  return useMutation({
    mutationFn: ({ userId, opportunityId }: { userId: string; opportunityId: string }) =>
      opportunityViewService.logView(userId, opportunityId),
  });
}

export function useContinueExploring(userId: string | undefined, limit = 12) {
  const viewsQuery = useQuery({
    queryKey: discoverKeys.recentViews(userId ?? ""),
    queryFn: () => opportunityViewService.listRecent(userId!, limit * 2),
    enabled: !!userId,
  });
  const { savedIds } = useSavedOpportunities(userId);
  const applicationsQuery = useQuery({
    queryKey: discoverKeys.applications(userId ?? ""),
    queryFn: () => applicationService.list(userId!),
    enabled: !!userId,
  });

  const viewedIds = useMemo(
    () => (viewsQuery.data ?? []).map((v) => v.opportunity_id),
    [viewsQuery.data],
  );
  const opportunitiesQuery = useQuery({
    queryKey: discoverKeys.opportunitiesByIds(viewedIds),
    queryFn: () => opportunityService.getManyByIds(viewedIds),
    enabled: viewedIds.length > 0,
  });

  const data = useMemo<Opportunity[]>(() => {
    const appliedIds = new Set((applicationsQuery.data ?? []).map((a) => a.opportunity_id));
    const oppById = new Map((opportunitiesQuery.data ?? []).map((o) => [o.id, o]));
    return viewedIds
      .filter((id) => !savedIds.has(id) && !appliedIds.has(id))
      .map((id) => oppById.get(id))
      .filter((o): o is Opportunity => Boolean(o))
      .slice(0, limit);
  }, [viewedIds, savedIds, applicationsQuery.data, opportunitiesQuery.data, limit]);

  return { data, isLoading: viewsQuery.isLoading };
}

// ============================================================
// FEEDBACK ("Not relevant")
// ============================================================
export function useSubmitOpportunityFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      opportunityId,
      feedback,
    }: {
      userId: string;
      opportunityId: string;
      feedback: OpportunityFeedbackValue;
    }) => opportunityFeedbackService.submit(userId, opportunityId, feedback),
    onSuccess: (_data, { userId, feedback }) => {
      qc.invalidateQueries({ queryKey: ["discover-recommendations", userId] });
      if (feedback === "not_relevant") toast.success("Thanks — we'll show you less like this");
    },
    onError: () => toast.error("Couldn't save your feedback"),
  });
}

// ============================================================
// SEARCH (faceted, paginated)
// ============================================================
export function useOpportunitySearch(filters: OpportunityFilters) {
  return useInfiniteQuery({
    queryKey: discoverKeys.search(filters),
    queryFn: ({ pageParam }) => opportunityService.search(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length : undefined),
    staleTime: 60 * 1000,
  });
}

// ============================================================
// OPPORTUNITY DETAIL
// ============================================================
export function useOpportunity(id: string | undefined) {
  return useQuery({
    queryKey: discoverKeys.opportunity(id ?? ""),
    queryFn: () => opportunityService.getById(id!),
    enabled: !!id,
  });
}

export function useApplicationForOpportunity(
  userId: string | undefined,
  opportunityId: string | undefined,
) {
  return useQuery({
    queryKey: discoverKeys.applicationFor(userId ?? "", opportunityId ?? ""),
    queryFn: () => applicationService.getForOpportunity(userId!, opportunityId!),
    enabled: !!userId && !!opportunityId,
  });
}

// ============================================================
// APPLICATION TRACKER (Kanban) — applications joined with their
// opportunity + checklist, the shape the board actually renders.
// ============================================================
export function useApplicationsWithDetails(userId: string | undefined) {
  const applicationsQuery = useQuery({
    queryKey: discoverKeys.applications(userId ?? ""),
    queryFn: () => applicationService.list(userId!),
    enabled: !!userId,
  });

  const applications = useMemo(() => applicationsQuery.data ?? [], [applicationsQuery.data]);
  const opportunityIds = useMemo(() => applications.map((a) => a.opportunity_id), [applications]);
  const applicationIds = useMemo(() => applications.map((a) => a.id), [applications]);

  const opportunitiesQuery = useQuery({
    queryKey: discoverKeys.opportunitiesByIds(opportunityIds),
    queryFn: () => opportunityService.getManyByIds(opportunityIds),
    enabled: opportunityIds.length > 0,
  });

  const checklistQuery = useQuery({
    queryKey: discoverKeys.checklist(applicationIds),
    queryFn: () => checklistService.listForApplications(applicationIds),
    enabled: applicationIds.length > 0,
  });

  const data = useMemo<ApplicationWithOpportunity[]>(() => {
    const oppById = new Map((opportunitiesQuery.data ?? []).map((o) => [o.id, o]));
    const checklistByApp = new Map<string, ApplicationChecklistItem[]>();
    for (const item of checklistQuery.data ?? []) {
      const list = checklistByApp.get(item.application_id) ?? [];
      list.push(item);
      checklistByApp.set(item.application_id, list);
    }
    return applications
      .map((a): ApplicationWithOpportunity | null => {
        const opportunity = oppById.get(a.opportunity_id);
        if (!opportunity) return null;
        return { ...a, opportunity, checklist: checklistByApp.get(a.id) ?? [] };
      })
      .filter((x): x is ApplicationWithOpportunity => x !== null);
  }, [applications, opportunitiesQuery.data, checklistQuery.data]);

  return {
    data,
    isLoading:
      applicationsQuery.isLoading || (opportunityIds.length > 0 && opportunitiesQuery.isLoading),
    isError: applicationsQuery.isError || opportunitiesQuery.isError || checklistQuery.isError,
  };
}

export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      opportunityId,
      status,
    }: {
      userId: string;
      opportunityId: string;
      status?: ApplicationStatus;
    }) => applicationService.create(userId, opportunityId, status),
    onSuccess: (_data, { userId, opportunityId }) => {
      qc.invalidateQueries({ queryKey: discoverKeys.applications(userId) });
      qc.invalidateQueries({ queryKey: discoverKeys.applicationFor(userId, opportunityId) });
      qc.invalidateQueries({ queryKey: ["discover-recommendations", userId] });
      toast.success("Added to your tracker");
    },
    onError: () => toast.error("Couldn't add this to your tracker"),
  });
}

export function useUpdateApplicationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus; userId: string }) =>
      applicationService.updateStatus(id, status),
    onMutate: async ({ id, status, userId }) => {
      await qc.cancelQueries({ queryKey: discoverKeys.applications(userId) });
      const prev = qc.getQueryData(discoverKeys.applications(userId));
      qc.setQueryData(discoverKeys.applications(userId), (old: typeof prev) =>
        Array.isArray(old)
          ? old.map((a: Application) => (a.id === id ? { ...a, status } : a))
          : old,
      );
      return { prev, userId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) qc.setQueryData(discoverKeys.applications(ctx.userId), ctx.prev);
      toast.error("Couldn't update status");
    },
    onSuccess: (_data, { userId, status }) => {
      qc.invalidateQueries({ queryKey: discoverKeys.applications(userId) });
      // Completing an application closes the loop server-side (adds an
      // Achievement + merges Skills) — refresh those sections too so the
      // update is visible without a manual page refresh.
      if (status === "completed") {
        qc.invalidateQueries({ queryKey: profileQueryKeys.achievements(userId) });
        qc.invalidateQueries({ queryKey: profileQueryKeys.skills(userId) });
        toast.success("Marked as completed — nice work! Your profile has been updated.");
      } else {
        toast.success("Status updated");
      }
    },
  });
}

export function useUpdateApplicationNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string; userId: string }) =>
      applicationService.updateNotes(id, notes),
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: discoverKeys.applications(userId) });
    },
    onError: () => toast.error("Couldn't save your notes"),
  });
}

export function useDeleteApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; userId: string }) => applicationService.remove(id),
    onMutate: async ({ id, userId }) => {
      await qc.cancelQueries({ queryKey: discoverKeys.applications(userId) });
      const prev = qc.getQueryData(discoverKeys.applications(userId));
      qc.setQueryData(discoverKeys.applications(userId), (old: typeof prev) =>
        Array.isArray(old) ? old.filter((a: Application) => a.id !== id) : old,
      );
      return { prev, userId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) qc.setQueryData(discoverKeys.applications(ctx.userId), ctx.prev);
      toast.error("Couldn't remove this from your tracker");
    },
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: discoverKeys.applications(userId) });
      toast.success("Removed from tracker");
    },
  });
}

// ============================================================
// CHECKLIST ITEMS
// ============================================================
export function useAddChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      applicationId,
      title,
      description,
      due_date,
    }: {
      applicationId: string;
      title: string;
      description?: string;
      due_date?: string | null;
    }) => checklistService.add(applicationId, { title, description, due_date }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discover-checklist"] });
      toast.success("Step added");
    },
    onError: () => toast.error("Couldn't add that step"),
  });
}

export function useToggleChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isComplete }: { id: string; isComplete: boolean }) =>
      checklistService.toggle(id, isComplete),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discover-checklist"] });
    },
    onError: () => toast.error("Couldn't update that step"),
  });
}

export function useDeleteChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => checklistService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discover-checklist"] });
      toast.success("Step removed");
    },
    onError: () => toast.error("Couldn't remove that step"),
  });
}
