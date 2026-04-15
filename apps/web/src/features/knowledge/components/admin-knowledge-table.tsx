import { communicativeFunctionValues, fixednessLevelValues, syntaxRoleValues } from "@english-coach/domain";
import { DataTable } from "@english-coach/ui";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { useMemo } from "react";
import { buildColumnFilters, getSingleSelectFilterValue } from "@/components/data-table/column-filter-state";
import { DataTableEmpty } from "@/components/data-table/data-table-empty";
import { formatCommunicativeFunction, formatFixednessLevel, formatSyntaxRole } from "@/lib/format";
import {
  createKnowledgeMutationError,
  useBulkApproveAdminKnowledgeMutation,
  useBulkDeleteAdminKnowledgeMutation,
} from "../mutations";
import type { AdminKnowledgeListItemView, AdminKnowledgeReviewStatus } from "../types";
import { createAdminKnowledgeColumns } from "./admin-knowledge-columns";

interface AdminKnowledgeTableProps {
  communicativeFunction?: string;
  fixednessLevel?: string;
  items: AdminKnowledgeListItemView[];
  reviewStatus?: AdminKnowledgeReviewStatus;
  searchValue: string;
  syntaxRole?: string;
  onCommunicativeFunctionChange: (value?: string) => void;
  onFixednessLevelChange: (value?: string) => void;
  onReviewStatusChange: (value?: AdminKnowledgeReviewStatus) => void;
  onSearchChange: (value: string) => void;
  onSyntaxRoleChange: (value?: string) => void;
}

export function AdminKnowledgeTable({
  communicativeFunction,
  fixednessLevel,
  items,
  reviewStatus,
  searchValue,
  syntaxRole,
  onCommunicativeFunctionChange,
  onFixednessLevelChange,
  onReviewStatusChange,
  onSearchChange,
  onSyntaxRoleChange,
}: AdminKnowledgeTableProps) {
  const bulkApproveMutation = useBulkApproveAdminKnowledgeMutation();
  const bulkDeleteMutation = useBulkDeleteAdminKnowledgeMutation();
  const columnFilters = useMemo(
    () =>
      buildColumnFilters([
        { id: "reviewStatus", value: reviewStatus },
        { id: "syntaxRole", value: syntaxRole },
        { id: "fixednessLevel", value: fixednessLevel },
        { id: "communicativeFunction", value: communicativeFunction },
      ]),
    [communicativeFunction, fixednessLevel, reviewStatus, syntaxRole],
  );

  function handleColumnFiltersChange(nextFilters: ColumnFiltersState) {
    onReviewStatusChange(getSingleSelectFilterValue<AdminKnowledgeReviewStatus>(nextFilters, "reviewStatus"));
    onSyntaxRoleChange(getSingleSelectFilterValue<string>(nextFilters, "syntaxRole"));
    onFixednessLevelChange(getSingleSelectFilterValue<string>(nextFilters, "fixednessLevel"));
    onCommunicativeFunctionChange(getSingleSelectFilterValue<string>(nextFilters, "communicativeFunction"));
  }

  return (
    <DataTable
      bulkActions={[
        {
          action: async (selectedRows) => {
            const selectedPendingIds = selectedRows.filter((row) => row.isPendingReview).map((row) => row.id);

            if (selectedPendingIds.length === 0) {
              return;
            }

            try {
              await bulkApproveMutation.mutateAsync(selectedPendingIds);
            } catch (error) {
              throw new Error(
                createKnowledgeMutationError(error, "We couldn't approve those knowledge items.").message,
              );
            }
          },
          confirmation: {
            confirmText: "Approve selected",
            description: "This makes the selected pending-review knowledge items available for downstream use.",
            title: "Approve selected knowledge items?",
          },
          disabled: bulkApproveMutation.isPending,
          label: "Approve selected",
        },
        {
          action: async (selectedRows) => {
            const selectedIds = selectedRows.map((row) => row.id);

            if (selectedIds.length === 0) {
              return;
            }

            try {
              await bulkDeleteMutation.mutateAsync(selectedIds);
            } catch (error) {
              throw new Error(createKnowledgeMutationError(error, "We couldn't delete those knowledge items.").message);
            }
          },
          confirmation: {
            confirmText: "Delete selected",
            description: "This permanently removes the selected knowledge items.",
            title: "Delete selected knowledge items?",
          },
          disabled: bulkDeleteMutation.isPending,
          isDestructive: true,
          label: "Delete selected",
        },
      ]}
      columnFilters={columnFilters}
      columns={createAdminKnowledgeColumns()}
      data={items}
      emptyState={
        <DataTableEmpty
          description="Try broadening the search or clearing one of the selected review and taxonomy filters."
          title="No knowledge items match these filters"
        />
      }
      facetedFilters={[
        {
          columnId: "reviewStatus",
          options: {
            approved: { label: "Approved" },
            pendingReview: { label: "Pending review" },
          },
          title: "Review state",
        },
        {
          columnId: "syntaxRole",
          options: Object.fromEntries(syntaxRoleValues.map((value) => [value, { label: formatSyntaxRole(value) }])),
          title: "Syntax role",
        },
        {
          columnId: "fixednessLevel",
          options: Object.fromEntries(
            fixednessLevelValues.map((value) => [value, { label: formatFixednessLevel(value) }]),
          ),
          title: "Fixedness",
        },
        {
          columnId: "communicativeFunction",
          options: Object.fromEntries(
            communicativeFunctionValues.map((value) => [value, { label: formatCommunicativeFunction(value) }]),
          ),
          title: "Function",
        },
      ]}
      globalFilter={searchValue}
      onColumnFiltersChange={handleColumnFiltersChange}
      onGlobalFilterChange={onSearchChange}
      searchPlaceholder="Search by pattern"
      selectionLabel="knowledge item"
    />
  );
}
