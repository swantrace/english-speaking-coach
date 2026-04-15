import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableBulkBar } from "@/components/data-table/data-table-bulk-bar";
import { DataTableEmpty } from "@/components/data-table/data-table-empty";
import {
  createScenarioMutationError,
  useBulkApproveAdminScenariosMutation,
  useBulkDeleteAdminScenariosMutation,
} from "../mutations";
import type { AdminScenarioListItemView } from "../types";
import { createAdminScenarioColumns } from "./scenario-table-columns";

interface AdminScenariosTableProps {
  items: AdminScenarioListItemView[];
}

export function AdminScenariosTable({ items }: AdminScenariosTableProps) {
  const [rowSelection, setRowSelection] = useState({});
  const bulkApproveMutation = useBulkApproveAdminScenariosMutation();
  const bulkDeleteMutation = useBulkDeleteAdminScenariosMutation();
  const table = useReactTable({
    columns: useMemo(() => createAdminScenarioColumns(), []),
    data: items,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
  });
  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);
  const selectedIds = selectedRows.map((row) => row.id);
  const selectedPendingIds = selectedRows.filter((row) => row.isPendingReview).map((row) => row.id);

  return (
    <div className="space-y-4">
      <DataTableBulkBar
        actions={[
          {
            confirmation: {
              confirmLabel: "Approve selected",
              description: "This makes the selected pending-review scenarios available to learners.",
              title: "Approve selected scenarios?",
            },
            disabled: selectedPendingIds.length === 0 || bulkApproveMutation.isPending,
            key: "bulk-approve",
            label: `Approve selected${selectedPendingIds.length > 0 ? ` (${selectedPendingIds.length})` : ""}`,
            onSelect: async () => {
              try {
                await bulkApproveMutation.mutateAsync(selectedPendingIds);
              } catch (error) {
                throw new Error(createScenarioMutationError(error, "We couldn't approve those scenarios.").message);
              }
            },
          },
          {
            confirmation: {
              confirmLabel: "Delete selected",
              description: "This permanently removes the selected scenarios.",
              title: "Delete selected scenarios?",
            },
            disabled: selectedIds.length === 0 || bulkDeleteMutation.isPending,
            isDestructive: true,
            key: "bulk-delete",
            label: `Delete selected${selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}`,
            onSelect: async () => {
              try {
                await bulkDeleteMutation.mutateAsync(selectedIds);
              } catch (error) {
                throw new Error(createScenarioMutationError(error, "We couldn't delete those scenarios.").message);
              }
            },
          },
        ]}
        onClearSelection={() => setRowSelection({})}
        selectedCount={selectedIds.length}
      />

      <DataTable
        emptyState={
          <DataTableEmpty
            description="Try broadening the search or clearing one of the selected tag and review-status filters."
            title="No scenarios match these filters"
          />
        }
        table={table}
      />
    </div>
  );
}
