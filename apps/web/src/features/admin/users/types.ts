import type { AdminUserListItem, AdminUserListResponse } from "@english-coach/contract/auth";
import type { UserRole, UserStatus } from "@english-coach/domain";

export interface AdminUserFilters {
  page?: number;
  pageSize?: number;
  role?: UserRole;
  search?: string;
  status?: UserStatus;
}

export interface AdminUserListItemView extends AdminUserListItem {
  createdAtLabel: string;
  lastLoginAtLabel: string;
  roleLabel: string;
  statusLabel: string;
}

export interface AdminUserListPageView {
  items: AdminUserListItemView[];
  page: AdminUserListResponse["page"];
  pageSize: AdminUserListResponse["pageSize"];
  total: AdminUserListResponse["total"];
  totalPages: AdminUserListResponse["totalPages"];
}

export type AdminUserActionKey = "approve" | "reject" | "promoteToAdmin" | "demoteToStudent" | "softDelete";

export interface AdminUserMutationError {
  message: string;
  status: number | null;
}
