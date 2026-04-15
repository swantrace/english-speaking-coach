import type { UserRole, UserStatus } from "@english-coach/domain";
import { DataTable } from "@english-coach/ui";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { useMemo } from "react";
import { buildColumnFilters, getSingleSelectFilterValue } from "@/components/data-table/column-filter-state";
import { DataTableEmpty } from "@/components/data-table/data-table-empty";
import { createAdminUserColumns } from "./columns";
import type { AdminUserListItemView } from "./types";

interface UserTableProps {
  items: AdminUserListItemView[];
  page: number;
  pageSize: number;
  role?: UserRole;
  searchValue: string;
  status?: UserStatus;
  total: number;
  totalPages: number;
  isPending?: boolean;
  onPageChange: (page: number) => void;
  onRoleChange: (role?: UserRole) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (status?: UserStatus) => void;
}

export function UserTable({
  items,
  page,
  pageSize,
  role,
  searchValue,
  status,
  total,
  totalPages,
  isPending = false,
  onPageChange,
  onRoleChange,
  onSearchChange,
  onStatusChange,
}: UserTableProps) {
  const columnFilters = useMemo(
    () =>
      buildColumnFilters([
        { id: "role", value: role },
        { id: "status", value: status },
      ]),
    [role, status],
  );

  function handleColumnFiltersChange(nextFilters: ColumnFiltersState) {
    onRoleChange(getSingleSelectFilterValue<UserRole>(nextFilters, "role"));
    onStatusChange(getSingleSelectFilterValue<UserStatus>(nextFilters, "status"));
  }

  return (
    <DataTable
      columnFilters={columnFilters}
      columns={createAdminUserColumns()}
      data={items}
      emptyState={
        <DataTableEmpty
          description="Try broadening the email search or clearing one of the current filters."
          title="No users match these filters"
        />
      }
      facetedFilters={[
        {
          columnId: "role",
          options: {
            admin: { label: "Admin" },
            student: { label: "Student" },
          },
          title: "Role",
        },
        {
          columnId: "status",
          options: {
            approved: { label: "Approved" },
            deleted: { label: "Deleted" },
            pending: { label: "Pending" },
            rejected: { label: "Rejected" },
          },
          title: "Status",
        },
      ]}
      getRowClassName={(row) => (row.status === "deleted" ? "bg-stone-50/70" : undefined)}
      globalFilter={searchValue}
      isPending={isPending}
      onColumnFiltersChange={handleColumnFiltersChange}
      onGlobalFilterChange={onSearchChange}
      pageSizeOptions={[10, 20, 50]}
      paginationMeta={{
        limit: pageSize,
        onPageChange,
        page,
        pages: totalPages,
        total,
      }}
      searchPlaceholder="Search by email"
    />
  );
}
