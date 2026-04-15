import { DataTable } from "@english-coach/ui";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { useMemo } from "react";
import { buildColumnFilters, getSingleSelectFilterValue } from "@/components/data-table/column-filter-state";
import { DataTableEmpty } from "@/components/data-table/data-table-empty";
import { createAdminSubmissionColumns } from "./columns";
import type { AdminSubmissionListItemView } from "./types";

type SubmissionKind = AdminSubmissionListItemView["kind"];

interface SubmissionsTableProps {
  items: AdminSubmissionListItemView[];
  kind?: SubmissionKind;
  searchValue: string;
  onKindChange: (kind?: SubmissionKind) => void;
  onRowClick: (submission: AdminSubmissionListItemView) => void;
  onSearchChange: (value: string) => void;
}

export function SubmissionsTable({
  items,
  kind,
  searchValue,
  onKindChange,
  onRowClick,
  onSearchChange,
}: SubmissionsTableProps) {
  const columnFilters = useMemo(() => buildColumnFilters([{ id: "kind", value: kind }]), [kind]);

  function handleColumnFiltersChange(nextFilters: ColumnFiltersState) {
    onKindChange(getSingleSelectFilterValue<SubmissionKind>(nextFilters, "kind"));
  }

  return (
    <DataTable
      columnFilters={columnFilters}
      columns={createAdminSubmissionColumns()}
      data={items}
      emptyState={
        <DataTableEmpty
          description="Try broadening the submission ID search or clearing the current kind filter."
          title="No submissions match these filters"
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
      ]}
      getRowAriaLabel={(row) => `Open submission ${row.id}`}
      getRowClassName={() => "cursor-pointer hover:bg-stone-50/70"}
      globalFilter={searchValue}
      onColumnFiltersChange={handleColumnFiltersChange}
      onGlobalFilterChange={onSearchChange}
      onRowClick={onRowClick}
      searchPlaceholder="Search by submission ID"
    />
  );
}
