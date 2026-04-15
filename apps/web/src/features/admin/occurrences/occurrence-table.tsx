import { DataTable } from "@english-coach/ui";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { useMemo } from "react";
import { buildColumnFilters, getSingleSelectFilterValue } from "@/components/data-table/column-filter-state";
import { DataTableEmpty } from "@/components/data-table/data-table-empty";
import { createOccurrenceColumns } from "./columns";
import type { ProposedOccurrenceListFilters, ProposedOccurrenceListItemView } from "./types";

interface OccurrenceTableProps {
  items: ProposedOccurrenceListItemView[];
  searchValue: string;
  status?: ProposedOccurrenceListFilters["status"];
  onSearchChange: (value: string) => void;
  onStatusChange: (status?: ProposedOccurrenceListFilters["status"]) => void;
}

export function OccurrenceTable({ items, searchValue, status, onSearchChange, onStatusChange }: OccurrenceTableProps) {
  const columnFilters = useMemo(() => buildColumnFilters([{ id: "status", value: status }]), [status]);

  function handleColumnFiltersChange(nextFilters: ColumnFiltersState) {
    onStatusChange(getSingleSelectFilterValue<ProposedOccurrenceListFilters["status"]>(nextFilters, "status"));
  }

  return (
    <DataTable
      columnFilters={columnFilters}
      columns={createOccurrenceColumns()}
      data={items}
      emptyState={
        <DataTableEmpty
          description="Try broadening the search or switching the status filter."
          title="No occurrences match these filters"
        />
      }
      facetedFilters={[
        {
          columnId: "status",
          options: {
            approved: { label: "Approved" },
            proposed: { label: "Proposed" },
            rejected: { label: "Rejected" },
          },
          title: "Status",
        },
      ]}
      globalFilter={searchValue}
      onColumnFiltersChange={handleColumnFiltersChange}
      onGlobalFilterChange={onSearchChange}
      searchPlaceholder="Search by pattern or transcript"
    />
  );
}
