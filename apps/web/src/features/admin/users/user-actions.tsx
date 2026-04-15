import type { UserRole } from "@english-coach/domain";
import type { RowActionItem } from "@/components/data-table/row-actions-dropdown";
import { RowActionsDropdown } from "@/components/data-table/row-actions-dropdown";
import {
  createAdminUserMutationError,
  useApproveAdminUserMutation,
  useRejectAdminUserMutation,
  useSetAdminUserRoleMutation,
  useSoftDeleteAdminUserMutation,
} from "./mutations";
import type { AdminUserActionKey, AdminUserListItemView } from "./types";

function isConservativeActionState(user: AdminUserListItemView) {
  return user.role === "admin" && user.status !== "approved";
}

function isPendingStudent(user: AdminUserListItemView) {
  return user.role === "student" && user.status === "pending";
}

function isApprovedUser(user: AdminUserListItemView) {
  return user.status === "approved";
}

function canToggleRole(user: AdminUserListItemView) {
  if (!isApprovedUser(user)) {
    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  return user.role === "student";
}

function canSoftDelete(user: AdminUserListItemView) {
  return user.status !== "deleted";
}

function getNextRole(user: AdminUserListItemView): UserRole | null {
  if (!canToggleRole(user)) {
    return null;
  }

  return user.role === "admin" ? "student" : "admin";
}

function createRoleChangeCopy(role: UserRole) {
  if (role === "admin") {
    return {
      actionKey: "promoteToAdmin" as const,
      confirmLabel: "Promote user",
      description: "This will grant admin access to the selected user.",
      label: "Promote to admin",
      title: "Promote this user to admin?",
    };
  }

  return {
    actionKey: "demoteToStudent" as const,
    confirmLabel: "Demote user",
    description: "This will remove admin access and switch the account back to student.",
    label: "Demote to student",
    title: "Demote this admin to student?",
  };
}

interface AdminUserActionsProps {
  user: AdminUserListItemView;
}

export function AdminUserActions({ user }: AdminUserActionsProps) {
  const approveMutation = useApproveAdminUserMutation();
  const rejectMutation = useRejectAdminUserMutation();
  const setRoleMutation = useSetAdminUserRoleMutation();
  const softDeleteMutation = useSoftDeleteAdminUserMutation();
  const isPending =
    approveMutation.isPending || rejectMutation.isPending || setRoleMutation.isPending || softDeleteMutation.isPending;
  const nextRole = getNextRole(user);

  async function runAction(actionKey: AdminUserActionKey) {
    try {
      if (actionKey === "approve") {
        await approveMutation.mutateAsync(user.id);
        return;
      }

      if (actionKey === "reject") {
        await rejectMutation.mutateAsync(user.id);
        return;
      }

      if (actionKey === "softDelete") {
        await softDeleteMutation.mutateAsync(user.id);
        return;
      }

      if ((actionKey === "promoteToAdmin" || actionKey === "demoteToStudent") && nextRole) {
        await setRoleMutation.mutateAsync({
          role: nextRole,
          userId: user.id,
        });
      }
    } catch (error) {
      if (actionKey === "approve") {
        throw new Error(createAdminUserMutationError(error, "We couldn't approve this user.").message);
      }

      if (actionKey === "reject") {
        throw new Error(createAdminUserMutationError(error, "We couldn't reject this user.").message);
      }

      if (actionKey === "softDelete") {
        throw new Error(createAdminUserMutationError(error, "We couldn't delete this user.").message);
      }

      throw new Error(createAdminUserMutationError(error, "We couldn't update this user's role.").message);
    }
  }

  if (isConservativeActionState(user)) {
    return <RowActionsDropdown actions={[]} triggerLabel={`Open actions for ${user.email}`} />;
  }

  const actions: RowActionItem[] = [];

  if (isPendingStudent(user)) {
    actions.push({
      disabled: isPending,
      key: "approve",
      label: "Approve account",
      onSelect: () => runAction("approve"),
    });
    actions.push({
      confirmation: {
        confirmLabel: "Reject account",
        description: "This keeps the account from being approved and should be used carefully for pending users only.",
        title: "Reject this pending account?",
      },
      disabled: isPending,
      key: "reject",
      label: "Reject account",
      onSelect: () => runAction("reject"),
    });
  }

  if (nextRole) {
    const roleCopy = createRoleChangeCopy(nextRole);

    actions.push({
      confirmation: {
        confirmLabel: roleCopy.confirmLabel,
        description: roleCopy.description,
        title: roleCopy.title,
      },
      disabled: isPending,
      key: roleCopy.actionKey,
      label: roleCopy.label,
      onSelect: () => runAction(roleCopy.actionKey),
      separatorBefore: actions.length > 0,
    });
  }

  if (canSoftDelete(user)) {
    actions.push({
      confirmation: {
        confirmLabel: "Delete user",
        description: "This performs a soft delete. The account will remain in the system for audit purposes.",
        title: "Soft-delete this user?",
      },
      disabled: isPending,
      isDestructive: true,
      key: "softDelete",
      label: "Soft-delete user",
      onSelect: () => runAction("softDelete"),
      separatorBefore: actions.length > 0,
    });
  }

  return <RowActionsDropdown actions={actions} triggerLabel={`Open actions for ${user.email}`} />;
}
