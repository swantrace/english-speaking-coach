import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableBulkBar } from "@/components/data-table/data-table-bulk-bar";
import { DataTableEmpty } from "@/components/data-table/data-table-empty";
import {
  createKnowledgeMutationError,
  useBulkApproveAdminKnowledgeMutation,
  useBulkDeleteAdminKnowledgeMutation,
} from "../mutations";
import type { AdminKnowledgeListItemView } from "../types";
import { createAdminKnowledgeColumns } from "./admin-knowledge-columns";

interface AdminKnowledgeTableProps {
  items: AdminKnowledgeListItemView[];
}

export function AdminKnowledgeTable({ items }: AdminKnowledgeTableProps) {
  const [rowSelection, setRowSelection] = useState({});
  const bulkApproveMutation = useBulkApproveAdminKnowledgeMutation();
  const bulkDeleteMutation = useBulkDeleteAdminKnowledgeMutation();
  const table = useReactTable({
    columns: useMemo(() => createAdminKnowledgeColumns(), []),
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
              description: "This makes the selected pending-review knowledge items available for downstream use.",
              title: "Approve selected knowledge items?",
            },
            disabled: selectedPendingIds.length === 0 || bulkApproveMutation.isPending,
            key: "bulk-approve",
            label: `Approve selected${selectedPendingIds.length > 0 ? ` (${selectedPendingIds.length})` : ""}`,
            onSelect: async () => {
              try {
                await bulkApproveMutation.mutateAsync(selectedPendingIds);
              } catch (error) {
                throw new Error(
                  createKnowledgeMutationError(error, "We couldn't approve those knowledge items.").message,
                );
              }
            },
          },
          {
            confirmation: {
              confirmLabel: "Delete selected",
              description: "This permanently removes the selected knowledge items.",
              title: "Delete selected knowledge items?",
            },
            disabled: selectedIds.length === 0 || bulkDeleteMutation.isPending,
            isDestructive: true,
            key: "bulk-delete",
            label: `Delete selected${selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}`,
            onSelect: async () => {
              try {
                await bulkDeleteMutation.mutateAsync(selectedIds);
              } catch (error) {
                throw new Error(
                  createKnowledgeMutationError(error, "We couldn't delete those knowledge items.").message,
                );
              }
            },
          },
        ]}
        onClearSelection={() => setRowSelection({})}
        selectedCount={selectedIds.length}
        selectionLabel="knowledge item"
      />

      <DataTable
        emptyState={
          <DataTableEmpty
            description="Try broadening the search or clearing one of the selected review and taxonomy filters."
            title="No knowledge items match these filters"
          />
        }
        table={table}
      />
    </div>
  );
}
