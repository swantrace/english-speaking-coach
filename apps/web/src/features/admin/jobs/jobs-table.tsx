import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableEmpty } from "@/components/data-table/data-table-empty";
import { createAdminJobColumns } from "./columns";
import type { AdminJobListItemView } from "./types";

interface JobsTableProps {
  items: AdminJobListItemView[];
  onRowClick: (job: AdminJobListItemView) => void;
}

export function JobsTable({ items, onRowClick }: JobsTableProps) {
  const table = useReactTable({
    columns: useMemo(() => createAdminJobColumns(), []),
    data: items,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataTable
      emptyState={
        <DataTableEmpty
          description="Try broadening the job ID search or clearing one of the current kind and status filters."
          title="No jobs match these filters"
        />
      }
      getRowAriaLabel={(row) => `Open job ${row.jobId}`}
      getRowClassName={() => "hover:bg-stone-50/70"}
      onRowClick={onRowClick}
      table={table}
    />
  );
}
