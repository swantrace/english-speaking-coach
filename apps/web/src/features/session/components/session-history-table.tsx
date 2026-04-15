import { cn, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@english-coach/ui";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import type { SessionHistoryListItemView } from "../types";
import { createHistorySessionColumns } from "./history-session-columns";

interface SessionHistoryTableProps {
  items: SessionHistoryListItemView[];
  onRowClick: (item: SessionHistoryListItemView) => void;
}

export function SessionHistoryTable({ items, onRowClick }: SessionHistoryTableProps) {
  const table = useReactTable({
    columns: createHistorySessionColumns(),
    data: items,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                aria-label={`Open ${row.original.title}`}
                className={cn("cursor-pointer transition-colors hover:bg-stone-50")}
                key={row.id}
                onClick={() => onRowClick(row.original)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onRowClick(row.original);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
