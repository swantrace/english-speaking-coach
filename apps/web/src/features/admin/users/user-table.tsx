import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableEmpty } from "@/components/data-table/data-table-empty";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { createAdminUserColumns } from "./columns";
import type { AdminUserListItemView } from "./types";

interface UserTableProps {
  items: AdminUserListItemView[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  isPending?: boolean;
  onPageChange: (page: number) => void;
}

export function UserTable({
  items,
  page,
  pageSize,
  total,
  totalPages,
  isPending = false,
  onPageChange,
}: UserTableProps) {
  const table = useReactTable({
    columns: createAdminUserColumns(),
    data: items,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <DataTable
        emptyState={
          <DataTableEmpty
            description="Try broadening the email search or clearing one of the current filters."
            title="No users match these filters"
          />
        }
        getRowClassName={(row) => (row.status === "deleted" ? "bg-stone-50/70" : undefined)}
        table={table}
      />
      <DataTablePagination
        isPending={isPending}
        onPageChange={onPageChange}
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
      />
    </div>
  );
}
