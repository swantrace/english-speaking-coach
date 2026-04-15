import { DataTable } from "@english-coach/ui";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { useMemo } from "react";
import {
  buildColumnFilters,
  getMultiSelectFilterValue,
  getSingleSelectFilterValue,
} from "@/components/data-table/column-filter-state";
import { DataTableEmpty } from "@/components/data-table/data-table-empty";
import {
  createScenarioMutationError,
  useBulkApproveAdminScenariosMutation,
  useBulkDeleteAdminScenariosMutation,
} from "../mutations";
import type { AdminScenarioListItemView, AdminScenarioReviewStatus } from "../types";
import { createAdminScenarioColumns } from "./scenario-table-columns";

interface AdminScenariosTableProps {
  availableTags: string[];
  items: AdminScenarioListItemView[];
  reviewStatus?: AdminScenarioReviewStatus;
  searchValue: string;
  selectedTags: string[];
  onReviewStatusChange: (reviewStatus?: AdminScenarioReviewStatus) => void;
  onSearchChange: (value: string) => void;
  onTagsChange: (tags: string[]) => void;
}

export function AdminScenariosTable({
  availableTags,
  items,
  reviewStatus,
  searchValue,
  selectedTags,
  onReviewStatusChange,
  onSearchChange,
  onTagsChange,
}: AdminScenariosTableProps) {
  const bulkApproveMutation = useBulkApproveAdminScenariosMutation();
  const bulkDeleteMutation = useBulkDeleteAdminScenariosMutation();
  const columnFilters = useMemo(
    () =>
      buildColumnFilters([
        { id: "reviewStatus", value: reviewStatus },
        { id: "tags", value: selectedTags },
      ]),
    [reviewStatus, selectedTags],
  );

  function handleColumnFiltersChange(nextFilters: ColumnFiltersState) {
    onReviewStatusChange(getSingleSelectFilterValue<AdminScenarioReviewStatus>(nextFilters, "reviewStatus"));
    onTagsChange(getMultiSelectFilterValue<string>(nextFilters, "tags"));
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
              throw new Error(createScenarioMutationError(error, "We couldn't approve those scenarios.").message);
            }
          },
          confirmation: {
            confirmText: "Approve selected",
            description: "This makes the selected pending-review scenarios available to learners.",
            title: "Approve selected scenarios?",
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
              throw new Error(createScenarioMutationError(error, "We couldn't delete those scenarios.").message);
            }
          },
          confirmation: {
            confirmText: "Delete selected",
            description: "This permanently removes the selected scenarios.",
            title: "Delete selected scenarios?",
          },
          disabled: bulkDeleteMutation.isPending,
          isDestructive: true,
          label: "Delete selected",
        },
      ]}
      columnFilters={columnFilters}
      columns={createAdminScenarioColumns()}
      data={items}
      emptyState={
        <DataTableEmpty
          description="Try broadening the search or clearing one of the selected tag and review-status filters."
          title="No scenarios match these filters"
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
          columnId: "tags",
          options: Object.fromEntries(availableTags.map((tag) => [tag, { label: tag }])),
          title: "Tags",
        },
      ]}
      globalFilter={searchValue}
      onColumnFiltersChange={handleColumnFiltersChange}
      onGlobalFilterChange={onSearchChange}
      searchPlaceholder="Search by title or setting"
      selectionLabel="scenario"
    />
  );
}
