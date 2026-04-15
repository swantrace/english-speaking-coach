import {
  type AdminUserListResponse,
  adminApproveUserInputSchema,
  adminRejectUserInputSchema,
  adminSetUserRoleInputSchema,
  adminSoftDeleteUserInputSchema,
  adminUserListQuerySchema,
  adminUserListResponseSchema,
} from "@english-coach/contract";
import type { UserRole } from "@english-coach/domain";
import axios from "axios";
import { apiClient } from "@/lib/axios";
import { formatDate, formatDateTime } from "@/lib/dates";
import { normalizeAdminUserListQueryKeyInput } from "@/lib/query-keys";
import type { AdminUserFilters, AdminUserListItemView, AdminUserListPageView } from "./types";

const ADMIN_USERS_PAGE_SIZE = 20;

const adminUserEndpoints = {
  approve: (userId: string) => `/api/admin/users/${userId}/approve`,
  list: "/api/admin/users",
  reject: (userId: string) => `/api/admin/users/${userId}/reject`,
  setRole: (userId: string) => `/api/admin/users/${userId}/role`,
  softDelete: (userId: string) => `/api/admin/users/${userId}/delete`,
} as const;

export function getAdminUsersPageSize() {
  return ADMIN_USERS_PAGE_SIZE;
}

function formatRoleLabel(role: UserRole) {
  return role === "admin" ? "Admin" : "Student";
}

function formatStatusLabel(status: AdminUserListItemView["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function mapAdminUserListItem(item: AdminUserListResponse["items"][number]): AdminUserListItemView {
  return {
    ...item,
    createdAtLabel: formatDate(item.createdAt),
    lastLoginAtLabel: item.lastLoginAt ? formatDateTime(item.lastLoginAt) : "Never",
    roleLabel: formatRoleLabel(item.role),
    statusLabel: formatStatusLabel(item.status),
  };
}

function mapAdminUserListResponse(data: AdminUserListResponse): AdminUserListPageView {
  return {
    items: data.items.map(mapAdminUserListItem),
    page: data.page,
    pageSize: data.pageSize,
    total: data.total,
    totalPages: data.totalPages,
  };
}

export function mapAdminApiError(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const responseMessage =
      typeof error.response?.data === "object" &&
      error.response?.data &&
      "message" in error.response.data &&
      typeof error.response.data.message === "string"
        ? error.response.data.message
        : null;

    return {
      message: responseMessage ?? fallbackMessage,
      status: error.response?.status ?? null,
    };
  }

  return {
    message: error instanceof Error ? error.message : fallbackMessage,
    status: null,
  };
}

export async function fetchAdminUsers(filters: AdminUserFilters = {}): Promise<AdminUserListPageView> {
  const normalizedFilters = normalizeAdminUserListQueryKeyInput(filters);
  const query = adminUserListQuerySchema.parse({
    page: normalizedFilters.page,
    pageSize: normalizedFilters.pageSize,
    role: normalizedFilters.role || undefined,
    search: normalizedFilters.search || undefined,
    status: normalizedFilters.status || undefined,
  });
  const response = await apiClient.get(adminUserEndpoints.list, {
    params: query,
  });

  return mapAdminUserListResponse(adminUserListResponseSchema.parse(response.data));
}

export async function approveAdminUser(userId: string) {
  await apiClient.post(adminUserEndpoints.approve(userId), adminApproveUserInputSchema.parse({}));
}

export async function rejectAdminUser(userId: string) {
  await apiClient.post(adminUserEndpoints.reject(userId), adminRejectUserInputSchema.parse({}));
}

export async function setAdminUserRole(userId: string, role: UserRole) {
  await apiClient.post(adminUserEndpoints.setRole(userId), adminSetUserRoleInputSchema.parse({ role }));
}

export async function softDeleteAdminUser(userId: string) {
  await apiClient.post(adminUserEndpoints.softDelete(userId), adminSoftDeleteUserInputSchema.parse({}));
}
