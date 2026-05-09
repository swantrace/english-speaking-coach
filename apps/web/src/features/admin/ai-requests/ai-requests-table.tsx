import { DataTable } from "@english-coach/ui";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { useMemo } from "react";
import { buildColumnFilters, getSingleSelectFilterValue } from "@/components/data-table/column-filter-state";
import { DataTableEmpty } from "@/components/data-table/data-table-empty";
import { createAdminAiRequestColumns } from "./columns";
import type { AdminAiRequestListItemView, AdminAiRequestStatus } from "./types";

interface AiRequestsTableProps {
  items: AdminAiRequestListItemView[];
  page: number;
  pageSize: number;
  searchValue: string;
  status?: AdminAiRequestStatus;
  total: number;
  totalPages: number;
  isPending?: boolean;
  onPageChange: (page: number) => void;
  onRowClick: (request: AdminAiRequestListItemView) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (status?: AdminAiRequestStatus) => void;
}

export function AiRequestsTable({
  items,
  page,
  pageSize,
  searchValue,
  status,
  total,
  totalPages,
  isPending = false,
  onPageChange,
  onRowClick,
  onSearchChange,
  onStatusChange,
}: AiRequestsTableProps) {
  const columnFilters = useMemo(() => buildColumnFilters([{ id: "status", value: status }]), [status]);

  function handleColumnFiltersChange(nextFilters: ColumnFiltersState) {
    onStatusChange(getSingleSelectFilterValue<AdminAiRequestStatus>(nextFilters, "status"));
  }

  return (
    <DataTable
      columnFilters={columnFilters}
      columns={createAdminAiRequestColumns()}
      data={items}
      emptyState={
        <DataTableEmpty
          description="Try broadening the ID, operation, provider, or related-record search."
          title="No AI requests match these filters"
        />
      }
      facetedFilters={[
        {
          columnId: "status",
          options: {
            completed: { label: "Completed" },
            failed: { label: "Failed" },
            started: { label: "Started" },
          },
          title: "Status",
        },
      ]}
      getRowAriaLabel={(row) => `Open AI request ${row.id}`}
      getRowClassName={() => "cursor-pointer hover:bg-stone-50/70"}
      globalFilter={searchValue}
      isPending={isPending}
      onColumnFiltersChange={handleColumnFiltersChange}
      onGlobalFilterChange={onSearchChange}
      onRowClick={onRowClick}
      pageSizeOptions={[10, 20, 50]}
      paginationMeta={{
        limit: pageSize,
        onPageChange,
        page,
        pages: totalPages,
        total,
      }}
      searchPlaceholder="Search requests"
    />
  );
}
