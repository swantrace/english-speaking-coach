import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function useKnowledgePointsQueryState() {
  const currentSearch = useSearch({ from: "/knowledge-points" });
  const navigate = useNavigate({ from: "/knowledge-points" });
  const [searchInput, setSearchInput] = useState(currentSearch.search ?? "");

  useEffect(() => {
    setSearchInput(currentSearch.search ?? "");
  }, [currentSearch.search]);

  useEffect(() => {
    const nextSearch = searchInput.trim() || undefined;

    if (nextSearch === currentSearch.search) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void navigate({
        replace: true,
        search: (previous) => ({ ...previous, page: 1, search: nextSearch }),
        to: "/knowledge-points",
      });
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentSearch.search, navigate, searchInput]);

  return {
    ...currentSearch,
    query: {
      page: currentSearch.page,
      pageSize: currentSearch.pageSize,
      search: currentSearch.search,
      sortBy: currentSearch.sortBy,
      sortDirection: currentSearch.sortDirection,
    },
    searchInput,
    setPage: (page: number) =>
      void navigate({ search: (previous) => ({ ...previous, page }), to: "/knowledge-points" }),
    setPageSize: (pageSize: number) =>
      void navigate({ search: (previous) => ({ ...previous, page: 1, pageSize }), to: "/knowledge-points" }),
    setSearchInput,
    setSortBy: (sortBy: "lastSeenAt" | "pattern" | "sessionCount" | "totalOccurrences") =>
      void navigate({ search: (previous) => ({ ...previous, page: 1, sortBy }), to: "/knowledge-points" }),
    setSortDirection: (sortDirection: "asc" | "desc") =>
      void navigate({ search: (previous) => ({ ...previous, page: 1, sortDirection }), to: "/knowledge-points" }),
  };
}