import { cn, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@english-coach/ui";
import { flexRender, type Table as ReactTable } from "@tanstack/react-table";
import type { ReactNode } from "react";

interface DataTableProps<TData> {
  table: ReactTable<TData>;
  emptyState?: ReactNode;
  className?: string;
  getRowClassName?: (row: TData) => string | undefined;
  getRowAriaLabel?: (row: TData) => string | undefined;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData>({
  table,
  emptyState,
  className,
  getRowAriaLabel,
  getRowClassName,
  onRowClick,
}: DataTableProps<TData>) {
  const visibleColumnCount = table.getVisibleLeafColumns().length;

  return (
    <div className={cn("overflow-hidden rounded-[0.25rem] border border-stone-200 bg-white shadow-sm", className)}>
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
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  aria-label={getRowAriaLabel?.(row.original)}
                  className={cn(onRowClick ? "cursor-pointer" : undefined, getRowClassName?.(row.original))}
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell className="p-0" colSpan={visibleColumnCount}>
                  {emptyState}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
