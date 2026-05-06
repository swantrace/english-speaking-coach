import {
  adminKnowledgeCreateSchema,
  adminKnowledgeDetailSchema,
  adminKnowledgeListQuerySchema,
  adminKnowledgeListResponseSchema,
  adminKnowledgeUpdateSchema,
  knowledgeGenerateSubmissionBodySchema,
  knowledgeGenerateSubmissionResponseSchema,
  knowledgePointDetailSchema,
  knowledgePointListQuerySchema,
  knowledgePointListResponseSchema,
} from "@english-coach/contract/knowledge";
import axios from "axios";
import { apiClient } from "@/lib/axios";
import { normalizeAdminKnowledgeListQueryKeyInput, normalizeKnowledgeListQueryKeyInput } from "@/lib/query-keys";
import { mapAdminKnowledgeDetail, mapAdminKnowledgeListItem, mapBulkKnowledgeSubmission } from "./mappers";
import type {
  AdminKnowledgeDetailView,
  AdminKnowledgeListFilters,
  AdminKnowledgeListView,
  AdminKnowledgeWritePayload,
  BulkKnowledgeSubmissionView,
  KnowledgeListFilters,
} from "./types";

const knowledgeEndpoints = {
  adminCreate: "/api/admin/knowledge-items",
  adminDelete: (knowledgeId: string) => `/api/admin/knowledge-items/${knowledgeId}`,
  adminDetail: (knowledgeId: string) => `/api/admin/knowledge-items/${knowledgeId}`,
  adminList: "/api/admin/knowledge-items",
  adminUpdate: (knowledgeId: string) => `/api/admin/knowledge-items/${knowledgeId}`,
  bulkGenerate: "/api/admin/knowledge-items/generate",
  learnerDetail: (knowledgeId: string) => `/api/knowledge-points/${knowledgeId}`,
  learnerList: "/api/knowledge-points",
} as const;

const ADMIN_KNOWLEDGE_PAGE_SIZE = 100;

export function mapKnowledgeApiError(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const responseMessage =
      typeof error.response?.data === "object" &&
      error.response?.data &&
      "error" in error.response.data &&
      typeof error.response.data.error === "string"
        ? error.response.data.error
        : typeof error.response?.data === "object" &&
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

export async function fetchKnowledgeList(filters: KnowledgeListFilters = {}) {
  const normalizedFilters = normalizeKnowledgeListQueryKeyInput(filters);
  const query = knowledgePointListQuerySchema.parse({
    page: 1,
    pageSize: 100,
    search: normalizedFilters.search || undefined,
    sortBy: "lastSeenAt",
    sortDirection: "desc",
  });
  const response = await apiClient.get(knowledgeEndpoints.learnerList, {
    params: query,
  });

  return knowledgePointListResponseSchema.parse(response.data);
}

export async function fetchKnowledgeDetail(knowledgeId: string) {
  const response = await apiClient.get(knowledgeEndpoints.learnerDetail(knowledgeId));
  return knowledgePointDetailSchema.parse(response.data);
}

export async function fetchAdminKnowledgeList(
  filters: AdminKnowledgeListFilters = {},
): Promise<AdminKnowledgeListView> {
  const normalizedFilters = normalizeAdminKnowledgeListQueryKeyInput(filters);
  const query = adminKnowledgeListQuerySchema.parse({
    communicativeFunction: normalizedFilters.communicativeFunction || undefined,
    fixednessLevel: normalizedFilters.fixednessLevel || undefined,
    isPendingReview:
      normalizedFilters.reviewStatus === "pendingReview"
        ? true
        : normalizedFilters.reviewStatus === "approved"
          ? false
          : undefined,
    page: 1,
    pageSize: ADMIN_KNOWLEDGE_PAGE_SIZE,
    search: normalizedFilters.search || undefined,
    sortBy: "updatedAt",
    sortDirection: "desc",
    patternType: normalizedFilters.patternType || undefined,
  });
  const response = await apiClient.get(knowledgeEndpoints.adminList, {
    params: query,
  });
  const data = adminKnowledgeListResponseSchema.parse(response.data);

  return {
    items: data.items.map(mapAdminKnowledgeListItem),
    total: data.total,
  };
}

export async function fetchAdminKnowledgeDetail(knowledgeId: string): Promise<AdminKnowledgeDetailView> {
  const response = await apiClient.get(knowledgeEndpoints.adminDetail(knowledgeId));
  return mapAdminKnowledgeDetail(adminKnowledgeDetailSchema.parse(response.data));
}

export async function createAdminKnowledge(values: AdminKnowledgeWritePayload) {
  const response = await apiClient.post(knowledgeEndpoints.adminCreate, adminKnowledgeCreateSchema.parse(values));
  return mapAdminKnowledgeDetail(adminKnowledgeDetailSchema.parse(response.data));
}

export async function updateAdminKnowledge(knowledgeId: string, values: Partial<AdminKnowledgeWritePayload>) {
  const response = await apiClient.patch(
    knowledgeEndpoints.adminUpdate(knowledgeId),
    adminKnowledgeUpdateSchema.parse(values),
  );
  return mapAdminKnowledgeDetail(adminKnowledgeDetailSchema.parse(response.data));
}

export async function deleteAdminKnowledge(knowledgeId: string) {
  await apiClient.delete(knowledgeEndpoints.adminDelete(knowledgeId));
}

export async function approveAdminKnowledge(knowledgeId: string) {
  return updateAdminKnowledge(knowledgeId, {
    isPendingReview: false,
  });
}

async function settleMutationBatch<TInput>(
  items: TInput[],
  worker: (item: TInput) => Promise<unknown>,
  fallbackMessage: string,
) {
  const results = await Promise.allSettled(items.map((item) => worker(item)));
  const failed = results.filter((result) => result.status === "rejected");

  if (failed.length === 0) {
    return;
  }

  const firstFailure = failed[0];

  if (firstFailure?.status === "rejected") {
    const firstError = mapKnowledgeApiError(firstFailure.reason, fallbackMessage);
    throw new Error(
      failed.length === 1 ? firstError.message : `${firstError.message} ${failed.length} requests did not complete.`,
    );
  }
}

export async function bulkApproveAdminKnowledge(knowledgeIds: string[]) {
  const idsToApprove = [...new Set(knowledgeIds.map((knowledgeId) => knowledgeId.trim()).filter(Boolean))];
  await settleMutationBatch(idsToApprove, approveAdminKnowledge, "We couldn't approve those knowledge items.");
}

export async function bulkDeleteAdminKnowledge(knowledgeIds: string[]) {
  const idsToDelete = [...new Set(knowledgeIds.map((knowledgeId) => knowledgeId.trim()).filter(Boolean))];
  await settleMutationBatch(idsToDelete, deleteAdminKnowledge, "We couldn't delete those knowledge items.");
}

export async function submitBulkKnowledgeGeneration(patterns: string[]): Promise<BulkKnowledgeSubmissionView> {
  const response = await apiClient.post(
    knowledgeEndpoints.bulkGenerate,
    knowledgeGenerateSubmissionBodySchema.parse({
      items: patterns.map((pattern) => ({
        message: pattern,
      })),
    }),
  );

  return mapBulkKnowledgeSubmission(knowledgeGenerateSubmissionResponseSchema.parse(response.data));
}
