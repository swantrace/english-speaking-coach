import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function useScenarioBrowserQueryState() {
  const currentSearch = useSearch({ from: "/scenarios/" });
  const navigate = useNavigate({ from: "/scenarios/" });
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
        search: (previous) => ({
          ...previous,
          page: 1,
          search: nextSearch,
        }),
        to: "/scenarios",
      });
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentSearch.search, navigate, searchInput]);

  return {
    ...currentSearch,
    query: {
      pageSize: currentSearch.pageSize,
      search: currentSearch.search,
    },
    searchInput,
    setSearchInput,
  };
}
