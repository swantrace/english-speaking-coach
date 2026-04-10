import { useNavigate, useSearch } from "@tanstack/react-router";

export function useAdminKnowledgeQueryState() {
  const currentSearch = useSearch({ from: "/admin/knowledge-items" });
  const navigate = useNavigate({ from: "/admin/knowledge-items" });

  const updateSearch = (updater: (previous: typeof currentSearch) => typeof currentSearch) => {
    void navigate({ search: updater, to: "/admin/knowledge-items" });
  };

  return {
    ...currentSearch,
    query: {
      page: currentSearch.page,
      pageSize: currentSearch.pageSize,
      search: currentSearch.search,
      sortBy: currentSearch.sortBy,
      sortDirection: currentSearch.sortDirection,
      tab: currentSearch.tab,
    },
    setPage: (page: number) => updateSearch((previous) => ({ ...previous, page })),
    setPageSize: (pageSize: number) => updateSearch((previous) => ({ ...previous, page: 1, pageSize })),
    setSearch: (search?: string) =>
      updateSearch((previous) => ({ ...previous, page: 1, search: search?.trim() || undefined })),
    setSort: (sortBy: "updatedAt" | "createdAt" | "pattern", sortDirection: "asc" | "desc") =>
      updateSearch((previous) => ({ ...previous, page: 1, sortBy, sortDirection })),
    setTab: (tab: "manage" | "generate") => updateSearch((previous) => ({ ...previous, tab })),
  };
}

export type AdminKnowledgeQueryState = ReturnType<typeof useAdminKnowledgeQueryState>;
