import { useNavigate } from "@tanstack/react-router";
import type { RowActionItem } from "@/components/data-table/row-actions-dropdown";
import { RowActionsDropdown } from "@/components/data-table/row-actions-dropdown";
import {
  createScenarioMutationError,
  useApproveAdminScenarioMutation,
  useDeleteAdminScenarioMutation,
} from "../mutations";
import type { AdminScenarioActionKey, AdminScenarioListItemView } from "../types";

interface AdminScenarioActionsProps {
  scenario: AdminScenarioListItemView;
}

export function AdminScenarioActions({ scenario }: AdminScenarioActionsProps) {
  const navigate = useNavigate();
  const approveMutation = useApproveAdminScenarioMutation();
  const deleteMutation = useDeleteAdminScenarioMutation();
  const isPending = approveMutation.isPending || deleteMutation.isPending;

  async function runAction(actionKey: AdminScenarioActionKey) {
    try {
      if (actionKey === "edit") {
        await navigate({
          params: { scenarioId: scenario.id },
          to: "/admin/scenarios/$scenarioId/edit",
        });
        return;
      }

      if (actionKey === "approve") {
        await approveMutation.mutateAsync(scenario.id);
        return;
      }

      await deleteMutation.mutateAsync(scenario.id);
    } catch (error) {
      if (actionKey === "approve") {
        throw new Error(createScenarioMutationError(error, "We couldn't approve this scenario.").message);
      }

      if (actionKey === "delete") {
        throw new Error(createScenarioMutationError(error, "We couldn't delete this scenario.").message);
      }

      throw error instanceof Error ? error : new Error("We couldn't open that scenario.");
    }
  }

  const actions: RowActionItem[] = [
    {
      disabled: isPending,
      hidden: !scenario.isPendingReview,
      key: "approve",
      label: "Approve scenario",
      onSelect: () => runAction("approve"),
    },
    {
      disabled: isPending,
      key: "edit",
      label: "Open edit page",
      onSelect: () => runAction("edit"),
      separatorBefore: scenario.isPendingReview,
    },
    {
      confirmation: {
        confirmLabel: "Delete scenario",
        description: "This permanently removes the scenario from admin management and learner browsing.",
        title: "Delete this scenario?",
      },
      disabled: isPending,
      isDestructive: true,
      key: "delete",
      label: "Delete scenario",
      onSelect: () => runAction("delete"),
      separatorBefore: true,
    },
  ];

  return <RowActionsDropdown actions={actions} triggerLabel={`Open actions for ${scenario.title}`} />;
}
