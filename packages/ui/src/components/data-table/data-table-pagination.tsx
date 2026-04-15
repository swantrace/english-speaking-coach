import type { Table } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "../button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import type { DataTablePaginationMeta } from "./types";

function getPageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, "...", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}

function DataTablePagination<TData>({
  table,
  isPending,
  paginationMeta,
  pageSizeOptions = [10, 20, 25, 30, 40, 50],
}: {
  table: Table<TData>;
  isPending?: boolean;
  paginationMeta?: DataTablePaginationMeta;
  pageSizeOptions?: number[];
}) {
  if (paginationMeta) {
    const { page, limit, total, pages, onPageChange, onLimitChange } = paginationMeta;
    const pageNumbers = getPageNumbers(page, Math.max(pages, 1));

    return (
      <div className="flex flex-col gap-4 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {onLimitChange ? (
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">Rows per page</span>
              <Select disabled={isPending} onValueChange={(value) => onLimitChange(Number(value))} value={`${limit}`}>
                <SelectTrigger className="h-8 w-[76px] rounded-lg shadow-none">
                  <SelectValue placeholder={limit} />
                </SelectTrigger>
                <SelectContent side="top">
                  {pageSizeOptions.map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <span>
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} result(s)
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="hidden min-w-28 text-right text-sm font-medium text-foreground sm:block">
            Page {page} of {Math.max(pages, 1)}
          </div>
          <div className="flex items-center gap-2">
            <Button className="hidden size-8 rounded-lg shadow-none md:flex" disabled={page === 1 || isPending} onClick={() => onPageChange(1)} size="icon" variant="outline">
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft />
            </Button>
            <Button className="size-8 rounded-lg shadow-none" disabled={page === 1 || isPending} onClick={() => onPageChange(Math.max(1, page - 1))} size="icon" variant="outline">
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft />
            </Button>
            {pageNumbers.map((pageNumber, index) =>
              pageNumber === "..." ? (
                <span key={`ellipsis-${index}`} className="px-1 text-sm text-muted-foreground">
                  ...
                </span>
              ) : (
                <Button
                  key={pageNumber}
                  className="h-8 min-w-8 rounded-lg px-2 shadow-none"
                  disabled={isPending}
                  onClick={() => onPageChange(pageNumber as number)}
                  size="sm"
                  type="button"
                  variant={pageNumber === page ? "default" : "outline"}
                >
                  {pageNumber}
                </Button>
              ),
            )}
            <Button className="size-8 rounded-lg shadow-none" disabled={page === pages || isPending} onClick={() => onPageChange(Math.min(pages, page + 1))} size="icon" variant="outline">
              <span className="sr-only">Go to next page</span>
              <ChevronRight />
            </Button>
            <Button className="hidden size-8 rounded-lg shadow-none md:flex" disabled={page === pages || isPending} onClick={() => onPageChange(pages)} size="icon" variant="outline">
              <span className="sr-only">Go to last page</span>
              <ChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentPage = table.getState().pagination.pageIndex + 1;
  const totalPages = Math.max(table.getPageCount(), 1);
  const totalRows = table.getFilteredRowModel().rows.length;
  const firstResult = totalRows === 0 ? 0 : table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1;
  const lastResult = Math.min(currentPage * table.getState().pagination.pageSize, totalRows);
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <div className="flex flex-col gap-4 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">Rows per page</span>
          <Select
            disabled={isPending}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
            value={`${table.getState().pagination.pageSize}`}
          >
            <SelectTrigger className="h-8 w-[76px] rounded-lg shadow-none">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span>
          Showing {firstResult} to {lastResult} of {totalRows} result(s)
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="hidden min-w-28 text-right text-sm font-medium text-foreground sm:block">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button className="hidden size-8 rounded-lg shadow-none md:flex" disabled={!table.getCanPreviousPage() || isPending} onClick={() => table.setPageIndex(0)} size="icon" variant="outline">
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft />
          </Button>
          <Button className="size-8 rounded-lg shadow-none" disabled={!table.getCanPreviousPage() || isPending} onClick={() => table.previousPage()} size="icon" variant="outline">
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft />
          </Button>
          {pageNumbers.map((pageNumber, index) =>
            pageNumber === "..." ? (
              <span key={`ellipsis-${index}`} className="px-1 text-sm text-muted-foreground">
                ...
              </span>
            ) : (
                <Button
                  key={pageNumber}
                  className="h-8 min-w-8 rounded-lg px-2 shadow-none"
                  disabled={isPending}
                  onClick={() => table.setPageIndex((pageNumber as number) - 1)}
                  size="sm"
                  type="button"
                  variant={pageNumber === currentPage ? "default" : "outline"}
                >
                  {pageNumber}
                </Button>
            ),
          )}
          <Button className="size-8 rounded-lg shadow-none" disabled={!table.getCanNextPage() || isPending} onClick={() => table.nextPage()} size="icon" variant="outline">
            <span className="sr-only">Go to next page</span>
            <ChevronRight />
          </Button>
          <Button className="hidden size-8 rounded-lg shadow-none md:flex" disabled={!table.getCanNextPage() || isPending} onClick={() => table.setPageIndex(table.getPageCount() - 1)} size="icon" variant="outline">
            <span className="sr-only">Go to last page</span>
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

export { DataTablePagination };
