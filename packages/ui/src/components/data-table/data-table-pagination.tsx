import type { Table } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "../button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import type { DataTablePaginationMeta } from "./types";

function DataTablePagination<TData>({
  table,
  isPending,
  paginationMeta,
}: {
  table: Table<TData>;
  isPending?: boolean;
  paginationMeta?: DataTablePaginationMeta;
}) {
  if (paginationMeta) {
    const { page, limit, total, pages, onPageChange, onLimitChange } = paginationMeta;

    return (
      <div className="flex items-center justify-between px-2">
        <div className="flex-1 text-sm text-muted-foreground">
          Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} result(s).
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          {onLimitChange ? (
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">Rows per page</p>
              <Select disabled={isPending} onValueChange={(value) => onLimitChange(Number(value))} value={`${limit}`}>
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={limit} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 25, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {page} of {pages}
          </div>
          <div className="flex items-center space-x-2">
            <Button className="hidden size-8 lg:flex" disabled={page === 1 || isPending} onClick={() => onPageChange(1)} size="icon" variant="outline">
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft />
            </Button>
            <Button className="size-8" disabled={page === 1 || isPending} onClick={() => onPageChange(Math.max(1, page - 1))} size="icon" variant="outline">
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft />
            </Button>
            <Button className="size-8" disabled={page === pages || isPending} onClick={() => onPageChange(Math.min(pages, page + 1))} size="icon" variant="outline">
              <span className="sr-only">Go to next page</span>
              <ChevronRight />
            </Button>
            <Button className="hidden size-8 lg:flex" disabled={page === pages || isPending} onClick={() => onPageChange(pages)} size="icon" variant="outline">
              <span className="sr-only">Go to last page</span>
              <ChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-muted-foreground">
        {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            disabled={isPending}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
            value={`${table.getState().pagination.pageSize}`}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 25, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </div>
        <div className="flex items-center space-x-2">
          <Button className="hidden size-8 lg:flex" disabled={!table.getCanPreviousPage() || isPending} onClick={() => table.setPageIndex(0)} size="icon" variant="outline">
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft />
          </Button>
          <Button className="size-8" disabled={!table.getCanPreviousPage() || isPending} onClick={() => table.previousPage()} size="icon" variant="outline">
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft />
          </Button>
          <Button className="size-8" disabled={!table.getCanNextPage() || isPending} onClick={() => table.nextPage()} size="icon" variant="outline">
            <span className="sr-only">Go to next page</span>
            <ChevronRight />
          </Button>
          <Button className="hidden size-8 lg:flex" disabled={!table.getCanNextPage() || isPending} onClick={() => table.setPageIndex(table.getPageCount() - 1)} size="icon" variant="outline">
            <span className="sr-only">Go to last page</span>
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

export { DataTablePagination };