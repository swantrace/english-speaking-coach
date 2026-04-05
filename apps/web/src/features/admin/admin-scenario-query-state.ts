import type { ScenarioReviewStatus, ScenarioSource } from "@english-coach/contract";
import { useNavigate, useSearch } from "@tanstack/react-router";

export function useAdminScenarioQueryState() {
  const currentSearch = useSearch({ from: "/admin/scenarios" });
  const navigate = useNavigate({ from: "/admin/scenarios" });

  const updateSearch = (updater: (previous: typeof currentSearch) => typeof currentSearch) => {
    void navigate({ search: updater, to: "/admin/scenarios" });
  };

  return {
    ...currentSearch,
    query: {
      page: currentSearch.page,
      pageSize: currentSearch.pageSize,
      reviewStatus: currentSearch.reviewStatus,
      search: currentSearch.search,
      sortBy: currentSearch.sortBy,
      sortDirection: currentSearch.sortDirection,
      source: currentSearch.source,
      tab: currentSearch.tab,
    },
    setPage: (page: number) => updateSearch((previous) => ({ ...previous, page })),
    setPageSize: (pageSize: number) => updateSearch((previous) => ({ ...previous, page: 1, pageSize })),
    setReviewStatus: (reviewStatus?: ScenarioReviewStatus) =>
      updateSearch((previous) => ({ ...previous, page: 1, reviewStatus })),
    setSearch: (search?: string) =>
      updateSearch((previous) => ({ ...previous, page: 1, search: search?.trim() || undefined })),
    setSort: (sortBy: "updatedAt" | "createdAt" | "title", sortDirection: "asc" | "desc") =>
      updateSearch((previous) => ({ ...previous, page: 1, sortBy, sortDirection })),
    setSource: (source?: ScenarioSource) => updateSearch((previous) => ({ ...previous, page: 1, source })),
    setTab: (tab: "manage" | "generate") => updateSearch((previous) => ({ ...previous, tab })),
  };
}

export type AdminScenarioQueryState = ReturnType<typeof useAdminScenarioQueryState>;
