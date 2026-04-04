import { startTransition, useEffect, useMemo, useState } from "react";

export type ListQuerySort = {
  key: string | null;
  direction: "asc" | "desc" | null;
};

export type ListQueryFilters = Record<string, string | string[] | undefined>;

type UseListQueryStateOptions = {
  initialPage?: number;
  initialPageSize?: number;
  initialSearch?: string;
  initialFilters?: ListQueryFilters;
  initialSort?: ListQuerySort;
  debounceMs?: number;
};

function useListQueryState({
  initialPage = 1,
  initialPageSize = 20,
  initialSearch = "",
  initialFilters = {},
  initialSort = { key: null, direction: null },
  debounceMs = 300,
}: UseListQueryStateOptions = {}) {
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [search, setSearchState] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [filters, setFiltersState] = useState<ListQueryFilters>(initialFilters);
  const [sort, setSortState] = useState<ListQuerySort>(initialSort);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        setDebouncedSearch(search.trim());
      });
    }, debounceMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [debounceMs, search]);

  const setPage = (nextPage: number) => {
    startTransition(() => {
      setPageState(Math.max(1, nextPage));
    });
  };

  const setPageSize = (nextPageSize: number) => {
    startTransition(() => {
      setPageSizeState(nextPageSize);
      setPageState(1);
    });
  };

  const setSearch = (nextSearch: string) => {
    startTransition(() => {
      setSearchState(nextSearch);
      setPageState(1);
    });
  };

  const setFilter = (key: string, value: string | string[] | undefined) => {
    startTransition(() => {
      setFiltersState((currentFilters) => ({
        ...currentFilters,
        [key]: value,
      }));
      setPageState(1);
    });
  };

  const setFilters = (nextFilters: ListQueryFilters) => {
    startTransition(() => {
      setFiltersState(nextFilters);
      setPageState(1);
    });
  };

  const setSort = (nextSort: ListQuerySort) => {
    startTransition(() => {
      setSortState(nextSort);
      setPageState(1);
    });
  };

  const resetFilters = () => {
    startTransition(() => {
      setFiltersState({});
      setPageState(1);
    });
  };

  const resetAll = () => {
    startTransition(() => {
      setPageState(initialPage);
      setPageSizeState(initialPageSize);
      setSearchState(initialSearch);
      setDebouncedSearch(initialSearch);
      setFiltersState(initialFilters);
      setSortState(initialSort);
    });
  };

  const hasActiveFilters = useMemo(
    () =>
      Object.values(filters).some((value) => {
        if (Array.isArray(value)) {
          return value.length > 0;
        }

        return Boolean(value);
      }),
    [filters],
  );

  const query = useMemo(
    () => ({
      filters,
      page,
      pageSize,
      search: debouncedSearch,
      sort,
    }),
    [debouncedSearch, filters, page, pageSize, sort],
  );

  return {
    debouncedSearch,
    filters,
    hasActiveFilters,
    page,
    pageSize,
    query,
    resetAll,
    resetFilters,
    search,
    setFilter,
    setFilters,
    setPage,
    setPageSize,
    setSearch,
    setSort,
    sort,
  };
}

export { useListQueryState };
