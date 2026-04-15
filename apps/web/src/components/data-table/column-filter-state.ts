import type { ColumnFiltersState } from "@tanstack/react-table";

export function buildColumnFilters(
  filters: Array<{
    id: string;
    value?: string | string[];
  }>,
): ColumnFiltersState {
  return filters.flatMap((filter) => {
    if (filter.value == null) {
      return [];
    }

    if (Array.isArray(filter.value)) {
      return filter.value.length > 0 ? [{ id: filter.id, value: filter.value }] : [];
    }

    return filter.value.length > 0 ? [{ id: filter.id, value: [filter.value] }] : [];
  });
}

export function getSingleSelectFilterValue<TValue>(filters: ColumnFiltersState, id: string) {
  const activeFilter = filters.find((filter) => filter.id === id)?.value;

  if (!Array.isArray(activeFilter) || activeFilter.length === 0) {
    return undefined;
  }

  return activeFilter[0] as TValue;
}

export function getMultiSelectFilterValue<TValue>(filters: ColumnFiltersState, id: string) {
  const activeFilter = filters.find((filter) => filter.id === id)?.value;

  if (!Array.isArray(activeFilter)) {
    return [] as TValue[];
  }

  return activeFilter as TValue[];
}
