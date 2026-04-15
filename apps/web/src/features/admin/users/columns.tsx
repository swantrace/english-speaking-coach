import { Badge } from "@english-coach/ui";
import type { ColumnDef } from "@tanstack/react-table";
import { includesSelectedValues } from "@/components/data-table/filter-fns";
import { UserStatusBadge } from "@/components/status/user-status-badge";
import type { AdminUserListItemView } from "./types";
import { AdminUserActions } from "./user-actions";

function getRoleBadgeVariant(role: AdminUserListItemView["role"]) {
  return role === "admin" ? "default" : "outline";
}

export function createAdminUserColumns(): ColumnDef<AdminUserListItemView>[] {
  const multiValueFilter = includesSelectedValues<AdminUserListItemView>();

  return [
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div className="max-w-[24rem] space-y-1">
          <p className="truncate font-medium text-slate-950">{row.original.email}</p>
          <p className="text-sm text-slate-500">Created {row.original.createdAtLabel}</p>
        </div>
      ),
    },
    {
      accessorKey: "role",
      filterFn: multiValueFilter,
      header: "Role",
      cell: ({ row }) => <Badge variant={getRoleBadgeVariant(row.original.role)}>{row.original.roleLabel}</Badge>,
    },
    {
      accessorKey: "status",
      filterFn: multiValueFilter,
      header: "Status",
      cell: ({ row }) => <UserStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => <span className="text-sm text-slate-700">{row.original.createdAtLabel}</span>,
    },
    {
      accessorKey: "lastLoginAt",
      header: "Last login",
      cell: ({ row }) => <span className="text-sm text-slate-700">{row.original.lastLoginAtLabel}</span>,
    },
    {
      id: "actions",
      enableHiding: false,
      enableSorting: false,
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <AdminUserActions user={row.original} />
        </div>
      ),
    },
  ];
}
