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
      isPendingReview: currentSearch.isPendingReview,
      page: currentSearch.page,
      pageSize: currentSearch.pageSize,
      search: currentSearch.search,
      sortBy: currentSearch.sortBy,
      sortDirection: currentSearch.sortDirection,
      tab: currentSearch.tab,
    },
    setIsPendingReview: (isPendingReview?: boolean) =>
      updateSearch((previous) => ({ ...previous, isPendingReview, page: 1 })),
    setPage: (page: number) => updateSearch((previous) => ({ ...previous, page })),
    setPageSize: (pageSize: number) => updateSearch((previous) => ({ ...previous, page: 1, pageSize })),
    setSearch: (search?: string) =>
      updateSearch((previous) => ({ ...previous, page: 1, search: search?.trim() || undefined })),
    setSort: (sortBy: "updatedAt" | "createdAt" | "title", sortDirection: "asc" | "desc") =>
      updateSearch((previous) => ({ ...previous, page: 1, sortBy, sortDirection })),
    setTab: (tab: "manage" | "generate") => updateSearch((previous) => ({ ...previous, tab })),
  };
}

export type AdminScenarioQueryState = ReturnType<typeof useAdminScenarioQueryState>;
