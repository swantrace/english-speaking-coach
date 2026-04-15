import { rankItem } from "@tanstack/match-sorter-utils";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type Row,
  type SortingState,
  type VisibilityState,
  useReactTable,
} from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";

import { Checkbox } from "../checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../table";
import { DataTableBulkActions } from "./data-table-bulk-actions";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableRowActions } from "./data-table-row-actions";
import { DataTableToolbar } from "./data-table-toolbar";
import type { DataTableProps } from "./types";

const fuzzyFilter: FilterFn<unknown> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value);
  addMeta({ itemRank });
  return itemRank.passed;
};

function DataTable<TData, TValue>({
  columns: baseColumns,
  data,
  emptyState,
  facetedFilters,
  rowActions,
  bulkActions,
  initialColumnVisibility,
  isPending,
  paginationMeta,
  pageSizeOptions,
  searchPlaceholder,
  selectionLabel,
  globalFilter: controlledGlobalFilter,
  onGlobalFilterChange,
  sorting: controlledSorting,
  onSortingChange,
  columnFilters: controlledColumnFilters,
  onColumnFiltersChange,
  onRowClick,
  getRowClassName,
  getRowAriaLabel,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialColumnVisibility ?? {});
  const [localColumnFilters, setLocalColumnFilters] = useState<ColumnFiltersState>(controlledColumnFilters ?? []);
  const [localSorting, setLocalSorting] = useState<SortingState>(controlledSorting ?? []);
  const [localGlobalFilter, setLocalGlobalFilter] = useState(controlledGlobalFilter ?? "");

  useEffect(() => {
    if (controlledColumnFilters) {
      setLocalColumnFilters(controlledColumnFilters);
    }
  }, [controlledColumnFilters]);

  useEffect(() => {
    if (controlledSorting) {
      setLocalSorting(controlledSorting);
    }
  }, [controlledSorting]);

  useEffect(() => {
    if (typeof controlledGlobalFilter === "string") {
      setLocalGlobalFilter(controlledGlobalFilter);
    }
  }, [controlledGlobalFilter]);

  const columns = useMemo<ColumnDef<TData, unknown>[]>(() => {
    const actionColumn = rowActions?.length
      ? [
          {
            id: "actions",
            cell: ({ row }: { row: Row<TData> }) => <DataTableRowActions actions={rowActions} rowData={row.original} />,
          } as ColumnDef<TData, unknown>,
        ]
      : [];

    const selectColumn = bulkActions?.length
      ? [
          {
            id: "select",
            header: ({ table }) => (
              <Checkbox
                aria-label="Select all"
                checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
                className="translate-y-0.5"
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
              />
            ),
            cell: ({ row }: { row: Row<TData> }) => (
              <Checkbox
                aria-label="Select row"
                checked={row.getIsSelected()}
                className="translate-y-0.5"
                onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
              />
            ),
            enableHiding: false,
            enableSorting: false,
          } as ColumnDef<TData, unknown>,
        ]
      : [];

    return [
      ...selectColumn,
      ...(baseColumns as ColumnDef<TData, unknown>[]).map((column) => {
        if (typeof column.header === "string") {
          return {
            ...column,
            header: ({ column: headerColumn }) => (
              <DataTableColumnHeader column={headerColumn} title={String(column.header)} />
            ),
          } as ColumnDef<TData, unknown>;
        }

        return column;
      }),
      ...actionColumn,
    ];
  }, [baseColumns, bulkActions, rowActions]);

  const table = useReactTable<TData>({
    data,
    columns,
    filterFns: { fuzzy: fuzzyFilter as FilterFn<TData> },
    state: {
      sorting: localSorting,
      columnVisibility,
      rowSelection,
      columnFilters: localColumnFilters,
      globalFilter: localGlobalFilter,
    },
    enableRowSelection: Boolean(bulkActions?.length),
    onRowSelectionChange: setRowSelection,
    onSortingChange: (updater) => {
      const nextValue = typeof updater === "function" ? updater(localSorting) : updater;
      setLocalSorting(nextValue);
      onSortingChange?.(nextValue);
    },
    onColumnFiltersChange: (updater) => {
      const nextValue = typeof updater === "function" ? updater(localColumnFilters) : updater;
      setLocalColumnFilters(nextValue);
      onColumnFiltersChange?.(nextValue);
    },
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: (updater) => {
      const nextValue = typeof updater === "function" ? updater(localGlobalFilter) : updater;
      setLocalGlobalFilter(nextValue);
      onGlobalFilterChange?.(nextValue);
    },
    globalFilterFn: fuzzyFilter as FilterFn<TData>,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: paginationMeta ? undefined : getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: Boolean(paginationMeta),
    pageCount: paginationMeta?.pages,
  });

  return (
    <div className="flex flex-col gap-4">
      <DataTableToolbar
        facetedFilters={facetedFilters}
        globalFilter={localGlobalFilter}
        onGlobalFilterChange={(value) => {
          setLocalGlobalFilter(value);
          onGlobalFilterChange?.(value);
        }}
        onResetColumnFilters={(nextFilters) => {
          setLocalColumnFilters(nextFilters);
          onColumnFiltersChange?.(nextFilters);
        }}
        searchPlaceholder={searchPlaceholder}
        table={table}
      />
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-background shadow-xs">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead colSpan={header.colSpan} key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  aria-label={getRowAriaLabel?.(row.original)}
                  className={getRowClassName?.(row.original)}
                  data-state={row.getIsSelected() && "selected"}
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onRowClick(row.original);
                          }
                        }
                      : undefined
                  }
                  role={onRowClick ? "button" : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell className="p-0" colSpan={columns.length}>
                  {emptyState ?? <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">{isPending ? "Loading..." : "No results."}</div>}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination isPending={isPending} pageSizeOptions={pageSizeOptions} paginationMeta={paginationMeta} table={table} />
      {bulkActions?.length ? <DataTableBulkActions actions={bulkActions} selectionLabel={selectionLabel} table={table} /> : null}
    </div>
  );
}

export { DataTable };
