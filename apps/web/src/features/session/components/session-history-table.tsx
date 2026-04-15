import type { SessionType } from "@english-coach/domain";
import { DataTable } from "@english-coach/ui";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { useMemo } from "react";
import { buildColumnFilters, getSingleSelectFilterValue } from "@/components/data-table/column-filter-state";
import { DataTableEmpty } from "@/components/data-table/data-table-empty";
import type { SessionHistoryListItemView } from "../types";
import { createHistorySessionColumns } from "./history-session-columns";

interface SessionHistoryTableProps {
  items: SessionHistoryListItemView[];
  searchValue: string;
  selectedSessionType?: SessionType;
  onRowClick: (item: SessionHistoryListItemView) => void;
  onSearchChange: (value: string) => void;
  onSessionTypeChange: (value?: SessionType) => void;
}

export function SessionHistoryTable({
  items,
  searchValue,
  selectedSessionType,
  onRowClick,
  onSearchChange,
  onSessionTypeChange,
}: SessionHistoryTableProps) {
  const columnFilters = useMemo(
    () => buildColumnFilters([{ id: "sessionType", value: selectedSessionType }]),
    [selectedSessionType],
  );

  function handleColumnFiltersChange(nextFilters: ColumnFiltersState) {
    onSessionTypeChange(getSingleSelectFilterValue<SessionType>(nextFilters, "sessionType"));
  }

  return (
    <DataTable
      columnFilters={columnFilters}
      columns={createHistorySessionColumns()}
      data={items}
      emptyState={
        <DataTableEmpty
          description="Try adjusting the search text or session type filter. Only completed learner-visible sessions are shown here."
          title="No sessions match these filters"
        />
      }
      facetedFilters={[
        {
          columnId: "sessionType",
          options: {
            "free-form": { label: "Free-form" },
            "role-play": { label: "Role-play" },
          },
          title: "Session type",
        },
      ]}
      getRowAriaLabel={(row) => `Open ${row.title}`}
      getRowClassName={() => "cursor-pointer transition-colors hover:bg-stone-50"}
      globalFilter={searchValue}
      onColumnFiltersChange={handleColumnFiltersChange}
      onGlobalFilterChange={onSearchChange}
      onRowClick={onRowClick}
      searchPlaceholder="Search sessions by title, type, or review notes"
    />
  );
}
