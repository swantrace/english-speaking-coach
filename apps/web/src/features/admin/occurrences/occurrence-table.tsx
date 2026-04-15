import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableEmpty } from "@/components/data-table/data-table-empty";
import { createOccurrenceColumns } from "./columns";
import type { ProposedOccurrenceListItemView } from "./types";

interface OccurrenceTableProps {
  items: ProposedOccurrenceListItemView[];
}

export function OccurrenceTable({ items }: OccurrenceTableProps) {
  const table = useReactTable({
    columns: useMemo(() => createOccurrenceColumns(), []),
    data: items,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataTable
      emptyState={
        <DataTableEmpty
          description="Try broadening the search or switching the status filter."
          title="No occurrences match these filters"
        />
      }
      table={table}
    />
  );
}
