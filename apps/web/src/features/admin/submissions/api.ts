import axios from "axios";
import { apiClient } from "@/lib/axios";
import { formatDateTime } from "@/lib/dates";
import { normalizeAdminSubmissionListQueryKeyInput } from "@/lib/query-keys";
import {
  type AdminSubmissionKind,
  type AdminSubmissionListFilters,
  type AdminSubmissionListItemView,
  type AdminSubmissionListPageView,
  type AdminSubmissionListResponse,
  adminSubmissionListFiltersSchema,
  adminSubmissionListResponseSchema,
} from "./types";

const adminSubmissionEndpoints = {
  list: "/api/admin/submissions",
} as const;

function formatSubmissionKindLabel(kind: AdminSubmissionKind) {
  switch (kind) {
    case "knowledge.generate":
      return "Knowledge generation";
    case "scenario.generate":
      return "Scenario generation";
    case "session.analysis":
      return "Session analysis";
  }
}

function mapAdminSubmissionListItem(item: AdminSubmissionListResponse["items"][number]): AdminSubmissionListItemView {
  return {
    ...item,
    completedJobs: item.completedJobs ?? 0,
    createdAtLabel: formatDateTime(item.createdAt),
    failedJobs: item.failedJobs ?? 0,
    kindLabel: formatSubmissionKindLabel(item.kind),
    queuedJobs: item.queuedJobs ?? 0,
    startedJobs: item.startedJobs ?? 0,
    updatedAtLabel: formatDateTime(item.updatedAt),
    userLabel: item.userId ? item.userId : "System",
  };
}

function mapAdminSubmissionListResponse(data: AdminSubmissionListResponse): AdminSubmissionListPageView {
  return {
    items: data.items.map(mapAdminSubmissionListItem),
    total: data.total,
  };
}

function createAdminSubmissionError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const responseMessage =
      typeof error.response?.data === "object" &&
      error.response?.data &&
      "error" in error.response.data &&
      typeof error.response.data.error === "string"
        ? error.response.data.error
        : null;

    return new Error(responseMessage ?? "The admin submissions feed is unavailable right now.");
  }

  return error instanceof Error ? error : new Error("The admin submissions feed is unavailable right now.");
}

export async function fetchAdminSubmissions(
  filters: AdminSubmissionListFilters = {},
): Promise<AdminSubmissionListPageView> {
  try {
    const normalizedFilters = normalizeAdminSubmissionListQueryKeyInput(filters);
    const query = adminSubmissionListFiltersSchema.parse({
      kind: normalizedFilters.kind || undefined,
      search: normalizedFilters.search || undefined,
    });
    const response = await apiClient.get(adminSubmissionEndpoints.list, {
      params: query,
    });

    return mapAdminSubmissionListResponse(adminSubmissionListResponseSchema.parse(response.data));
  } catch (error) {
    throw createAdminSubmissionError(error);
  }
}
