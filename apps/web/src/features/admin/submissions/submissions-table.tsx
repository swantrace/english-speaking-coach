import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableEmpty } from "@/components/data-table/data-table-empty";
import { createAdminSubmissionColumns } from "./columns";
import type { AdminSubmissionListItemView } from "./types";

interface SubmissionsTableProps {
  items: AdminSubmissionListItemView[];
  onRowClick: (submission: AdminSubmissionListItemView) => void;
}

export function SubmissionsTable({ items, onRowClick }: SubmissionsTableProps) {
  const table = useReactTable({
    columns: useMemo(() => createAdminSubmissionColumns(), []),
    data: items,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataTable
      emptyState={
        <DataTableEmpty
          description="Try broadening the submission ID search or clearing the current kind filter."
          title="No submissions match these filters"
        />
      }
      getRowAriaLabel={(row) => `Open submission ${row.id}`}
      getRowClassName={() => "hover:bg-stone-50/70"}
      onRowClick={onRowClick}
      table={table}
    />
  );
}
