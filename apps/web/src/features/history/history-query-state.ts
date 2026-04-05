import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const historyDetailTabs = [
  { key: "transcript", label: "Original transcript" },
  { key: "review", label: "Post-session review" },
  { key: "rewritten", label: "Rewritten transcript" },
] as const;

export function useHistoryListQueryState() {
  const currentSearch = useSearch({ from: "/history/" });
  const navigate = useNavigate({ from: "/history/" });
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
        to: "/history",
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
      sessionType: currentSearch.sessionType,
      sortBy: currentSearch.sortBy,
      sortDirection: currentSearch.sortDirection,
    },
    searchInput,
    setPage: (page: number) => void navigate({ search: (previous) => ({ ...previous, page }), to: "/history" }),
    setPageSize: (pageSize: number) =>
      void navigate({ search: (previous) => ({ ...previous, page: 1, pageSize }), to: "/history" }),
    setSearchInput,
    setSessionType: (sessionType: "role-play" | "free-form" | undefined) =>
      void navigate({ search: (previous) => ({ ...previous, page: 1, sessionType }), to: "/history" }),
    setSortBy: (sortBy: "startedAt" | "endedAt" | "title") =>
      void navigate({ search: (previous) => ({ ...previous, page: 1, sortBy }), to: "/history" }),
    setSortDirection: (sortDirection: "asc" | "desc") =>
      void navigate({ search: (previous) => ({ ...previous, page: 1, sortDirection }), to: "/history" }),
  };
}
