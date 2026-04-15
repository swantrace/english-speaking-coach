import { DataTable } from "@english-coach/ui";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { useMemo } from "react";
import { buildColumnFilters, getSingleSelectFilterValue } from "@/components/data-table/column-filter-state";
import { DataTableEmpty } from "@/components/data-table/data-table-empty";
import { createAdminJobColumns } from "./columns";
import type { AdminJobListItemView, AdminJobStatus } from "./types";

type JobKind = AdminJobListItemView["kind"];

interface JobsTableProps {
  items: AdminJobListItemView[];
  kind?: JobKind;
  searchValue: string;
  status?: AdminJobStatus;
  onKindChange: (kind?: JobKind) => void;
  onRowClick: (job: AdminJobListItemView) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (status?: AdminJobStatus) => void;
}

export function JobsTable({
  items,
  kind,
  searchValue,
  status,
  onKindChange,
  onRowClick,
  onSearchChange,
  onStatusChange,
}: JobsTableProps) {
  const columnFilters = useMemo(
    () =>
      buildColumnFilters([
        { id: "kind", value: kind },
        { id: "status", value: status },
      ]),
    [kind, status],
  );

  function handleColumnFiltersChange(nextFilters: ColumnFiltersState) {
    onKindChange(getSingleSelectFilterValue<JobKind>(nextFilters, "kind"));
    onStatusChange(getSingleSelectFilterValue<AdminJobStatus>(nextFilters, "status"));
  }

  return (
    <DataTable
      columnFilters={columnFilters}
      columns={createAdminJobColumns()}
      data={items}
      emptyState={
        <DataTableEmpty
          description="Try broadening the job ID search or clearing one of the current kind and status filters."
          title="No jobs match these filters"
        />
      }
      facetedFilters={[
        {
          columnId: "kind",
          options: {
            "knowledge.generate": { label: "Knowledge generation" },
            "scenario.generate": { label: "Scenario generation" },
            "session.analysis": { label: "Session analysis" },
          },
          title: "Kind",
        },
        {
          columnId: "status",
          options: {
            completed: { label: "Completed" },
            failed: { label: "Failed" },
            queued: { label: "Queued" },
            started: { label: "Started" },
          },
          title: "Status",
        },
      ]}
      getRowAriaLabel={(row) => `Open job ${row.jobId}`}
      getRowClassName={() => "cursor-pointer hover:bg-stone-50/70"}
      globalFilter={searchValue}
      onColumnFiltersChange={handleColumnFiltersChange}
      onGlobalFilterChange={onSearchChange}
      onRowClick={onRowClick}
      searchPlaceholder="Search by job ID"
    />
  );
}
