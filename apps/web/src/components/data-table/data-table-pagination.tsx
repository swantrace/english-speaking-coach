import { Button } from "@english-coach/ui";

interface DataTablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  isPending?: boolean;
  onPageChange: (page: number) => void;
}

export function DataTablePagination({
  page,
  pageSize,
  total,
  totalPages,
  isPending = false,
  onPageChange,
}: DataTablePaginationProps) {
  if (total <= 0) {
    return null;
  }

  const firstResult = (page - 1) * pageSize + 1;
  const lastResult = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-4 px-1 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-600">
        Showing {firstResult.toLocaleString()} to {lastResult.toLocaleString()} of {total.toLocaleString()} users
      </p>

      <div className="flex items-center gap-2">
        <Button
          disabled={page <= 1 || isPending}
          onClick={() => onPageChange(page - 1)}
          type="button"
          variant="outline"
        >
          Previous
        </Button>
        <p className="min-w-28 text-center text-sm text-slate-600">
          Page {page} of {Math.max(totalPages, 1)}
        </p>
        <Button
          disabled={page >= totalPages || isPending}
          onClick={() => onPageChange(page + 1)}
          type="button"
          variant="outline"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
