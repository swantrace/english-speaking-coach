import type { ColumnFiltersState, Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "../button";
import { Input } from "../input";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import type { DataTableFacetedFilterConfig } from "./types";
import { DataTableViewOptions } from "./data-table-view-options";

function DataTableToolbar<TData>({
  table,
  facetedFilters,
  globalFilter,
  onGlobalFilterChange,
  searchPlaceholder = "Filter...",
  onResetColumnFilters,
}: {
  table: Table<TData>;
  facetedFilters?: DataTableFacetedFilterConfig[];
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  searchPlaceholder?: string;
  onResetColumnFilters?: (nextFilters: ColumnFiltersState) => void;
}) {
  const isFiltered = table.getState().columnFilters.length > 0 || globalFilter.trim().length > 0;
  const [localFilter, setLocalFilter] = useState(globalFilter);

  useEffect(() => {
    setLocalFilter(globalFilter);
  }, [globalFilter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onGlobalFilterChange(localFilter);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [localFilter, onGlobalFilterChange]);

  const resetFilters = () => {
    table.resetColumnFilters();
    setLocalFilter("");
    onGlobalFilterChange("");
    onResetColumnFilters?.([]);
  };

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          className="h-9 w-full rounded-xl border-border/70 bg-background shadow-none sm:max-w-xs"
          onChange={(event) => setLocalFilter(event.target.value)}
          placeholder={searchPlaceholder}
          type="search"
          value={localFilter}
        />
        {facetedFilters?.map((filter) => {
          const column = table.getColumn(filter.columnId);

          if (!column) {
            return null;
          }

          return <DataTableFacetedFilter key={filter.columnId} column={column} options={filter.options} title={filter.title} />;
        })}
        {isFiltered ? (
          <Button className="h-9 rounded-xl px-3 shadow-none" onClick={resetFilters} type="button" variant="ghost">
            Reset
            <X className="size-4" />
          </Button>
        ) : null}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  );
}

export { DataTableToolbar };
