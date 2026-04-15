import { useNavigate } from "@tanstack/react-router";
import type { RowActionItem } from "@/components/data-table/row-actions-dropdown";
import { RowActionsDropdown } from "@/components/data-table/row-actions-dropdown";
import {
  createKnowledgeMutationError,
  useApproveAdminKnowledgeMutation,
  useDeleteAdminKnowledgeMutation,
} from "../mutations";
import type { AdminKnowledgeListItemView } from "../types";

interface AdminKnowledgeActionsProps {
  knowledgeItem: AdminKnowledgeListItemView;
}

export function AdminKnowledgeActions({ knowledgeItem }: AdminKnowledgeActionsProps) {
  const navigate = useNavigate();
  const approveMutation = useApproveAdminKnowledgeMutation();
  const deleteMutation = useDeleteAdminKnowledgeMutation();
  const isPending = approveMutation.isPending || deleteMutation.isPending;

  async function runAction(actionKey: "approve" | "delete" | "edit") {
    try {
      if (actionKey === "edit") {
        await navigate({
          params: { knowledgeId: knowledgeItem.id },
          to: "/admin/knowledge/$knowledgeId/edit",
        });
        return;
      }

      if (actionKey === "approve") {
        await approveMutation.mutateAsync(knowledgeItem.id);
        return;
      }

      await deleteMutation.mutateAsync(knowledgeItem.id);
    } catch (error) {
      if (actionKey === "approve") {
        throw new Error(createKnowledgeMutationError(error, "We couldn't approve this knowledge item.").message);
      }

      if (actionKey === "delete") {
        throw new Error(createKnowledgeMutationError(error, "We couldn't delete this knowledge item.").message);
      }

      throw error instanceof Error ? error : new Error("We couldn't open that knowledge item.");
    }
  }

  const actions: RowActionItem[] = [
    {
      disabled: isPending,
      hidden: !knowledgeItem.isPendingReview,
      key: "approve",
      label: "Approve knowledge item",
      onSelect: () => runAction("approve"),
    },
    {
      disabled: isPending,
      key: "edit",
      label: "Open edit page",
      onSelect: () => runAction("edit"),
      separatorBefore: knowledgeItem.isPendingReview,
    },
    {
      confirmation: {
        confirmLabel: "Delete knowledge item",
        description: "This permanently removes the knowledge item from admin management.",
        title: "Delete this knowledge item?",
      },
      disabled: isPending,
      isDestructive: true,
      key: "delete",
      label: "Delete knowledge item",
      onSelect: () => runAction("delete"),
      separatorBefore: true,
    },
  ];

  return <RowActionsDropdown actions={actions} triggerLabel={`Open actions for ${knowledgeItem.pattern}`} />;
}
