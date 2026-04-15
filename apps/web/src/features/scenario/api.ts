import {
  adminScenarioCreateSchema,
  adminScenarioListQuerySchema,
  adminScenarioListResponseSchema,
  adminScenarioUpdateSchema,
  scenarioGenerateSubmissionResponseSchema,
  scenarioPageResponseSchema,
  scenarioSchema,
} from "@english-coach/contract/scenario";

import { apiClient, isAxiosError } from "@/lib/axios";
import { normalizeAdminScenarioListQueryKeyInput, normalizeScenarioListQueryKeyInput } from "@/lib/query-keys";
import {
  isPracticeEligibleScenario,
  mapBulkScenarioSubmission,
  mapScenarioToAdminDetail,
  mapScenarioToAdminListItem,
  mapScenarioToDetail,
  mapScenarioToListItem,
} from "./mappers";
import type {
  AdminScenarioDetailView,
  AdminScenarioListFilters,
  AdminScenarioListPageView,
  AdminScenarioWritePayload,
  BulkScenarioSubmissionView,
  ScenarioDetail,
  ScenarioListFilters,
  ScenarioListView,
} from "./types";

const LEARNER_SCENARIOS_ENDPOINT = "/api/learner/scenarios";
const SCENARIO_DETAIL_ENDPOINT = "/api/scenarios";
const STUDENT_SCENARIO_PAGE_SIZE = 100;
const ADMIN_SCENARIOS_PAGE_SIZE = 100;

const adminScenarioEndpoints = {
  bulkGenerate: "/api/scenarios/generate",
  create: "/api/admin/scenarios",
  delete: (scenarioId: string) => `/api/admin/scenarios/${scenarioId}`,
  detail: (scenarioId: string) => `/api/scenarios/${scenarioId}`,
  list: "/api/admin/scenarios",
  update: (scenarioId: string) => `/api/admin/scenarios/${scenarioId}`,
} as const;

function scenarioMatchesTags(tags: string[], selectedTags: string[]) {
  if (selectedTags.length === 0) {
    return true;
  }

  const tagSet = new Set(tags);
  return selectedTags.every((tag) => tagSet.has(tag));
}

export async function fetchStudentScenarioList(filters: ScenarioListFilters = {}): Promise<ScenarioListView> {
  const normalizedFilters = normalizeScenarioListQueryKeyInput(filters);
  const response = await apiClient.get(LEARNER_SCENARIOS_ENDPOINT, {
    params: {
      page: 1,
      pageSize: STUDENT_SCENARIO_PAGE_SIZE,
      search: normalizedFilters.search || undefined,
      sortBy: "updatedAt",
      sortDirection: "desc",
    },
  });

  const data = scenarioPageResponseSchema.parse(response.data);
  const eligibleScenarios = data.items.filter(isPracticeEligibleScenario);
  const availableTags = [
    ...new Set(
      eligibleScenarios
        .flatMap((scenario) => scenario.tags)
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ].sort((left, right) => left.localeCompare(right));

  // Backend search exists today; tag filtering stays in the mapper layer until the learner list endpoint gains tag params.
  const filteredScenarios = eligibleScenarios.filter((scenario) =>
    scenarioMatchesTags(scenario.tags, normalizedFilters.tags),
  );

  return {
    availableTags,
    items: filteredScenarios.map(mapScenarioToListItem),
    total: filteredScenarios.length,
  };
}

export async function fetchStudentScenarioDetail(scenarioId: string): Promise<ScenarioDetail> {
  const response = await apiClient.get(`${SCENARIO_DETAIL_ENDPOINT}/${scenarioId}`);
  const data = scenarioSchema.parse(response.data);

  return mapScenarioToDetail(data);
}

export function mapScenarioApiError(error: unknown, fallbackMessage: string) {
  if (isAxiosError(error)) {
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

export async function fetchAdminScenarioList(
  filters: AdminScenarioListFilters = {},
): Promise<AdminScenarioListPageView> {
  const normalizedFilters = normalizeAdminScenarioListQueryKeyInput(filters);
  const query = adminScenarioListQuerySchema.parse({
    isPendingReview:
      normalizedFilters.reviewStatus === "pendingReview"
        ? true
        : normalizedFilters.reviewStatus === "approved"
          ? false
          : undefined,
    page: 1,
    pageSize: ADMIN_SCENARIOS_PAGE_SIZE,
    search: normalizedFilters.search || undefined,
    sortBy: "updatedAt",
    sortDirection: "desc",
  });
  const response = await apiClient.get(adminScenarioEndpoints.list, {
    params: query,
  });
  const data = adminScenarioListResponseSchema.parse(response.data);
  const items = data.items.map(mapScenarioToAdminListItem);
  const availableTags = [...new Set(items.flatMap((item) => item.tags))].sort((left, right) =>
    left.localeCompare(right),
  );
  const filteredItems = items.filter((item) => scenarioMatchesTags(item.tags, normalizedFilters.tags));

  return {
    availableTags,
    items: filteredItems,
    total: filteredItems.length,
  };
}

export async function fetchAdminScenarioDetail(scenarioId: string): Promise<AdminScenarioDetailView> {
  const response = await apiClient.get(adminScenarioEndpoints.detail(scenarioId));
  return mapScenarioToAdminDetail(scenarioSchema.parse(response.data));
}

export async function createAdminScenario(values: AdminScenarioWritePayload) {
  const response = await apiClient.post(adminScenarioEndpoints.create, adminScenarioCreateSchema.parse(values));
  return mapScenarioToAdminDetail(scenarioSchema.parse(response.data));
}

export async function updateAdminScenario(scenarioId: string, values: Partial<AdminScenarioWritePayload>) {
  const response = await apiClient.patch(
    adminScenarioEndpoints.update(scenarioId),
    adminScenarioUpdateSchema.parse(values),
  );
  return mapScenarioToAdminDetail(scenarioSchema.parse(response.data));
}

export async function deleteAdminScenario(scenarioId: string) {
  await apiClient.delete(adminScenarioEndpoints.delete(scenarioId));
}

export async function approveAdminScenario(scenarioId: string) {
  return updateAdminScenario(scenarioId, {
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

  if (failed.length > 0) {
    const firstFailure = failed[0];

    if (firstFailure?.status === "rejected") {
      const firstError = mapScenarioApiError(firstFailure.reason, fallbackMessage);
      throw new Error(
        failed.length === 1 ? firstError.message : `${firstError.message} ${failed.length} requests did not complete.`,
      );
    }
  }
}

export async function bulkApproveAdminScenarios(scenarioIds: string[]) {
  const idsToApprove = [...new Set(scenarioIds.map((scenarioId) => scenarioId.trim()).filter(Boolean))];
  await settleMutationBatch(idsToApprove, approveAdminScenario, "We couldn't approve those scenarios.");
}

export async function bulkDeleteAdminScenarios(scenarioIds: string[]) {
  const idsToDelete = [...new Set(scenarioIds.map((scenarioId) => scenarioId.trim()).filter(Boolean))];
  await settleMutationBatch(idsToDelete, deleteAdminScenario, "We couldn't delete those scenarios.");
}

export async function submitBulkScenarioGeneration(drafts: string[]): Promise<BulkScenarioSubmissionView> {
  const response = await apiClient.post(adminScenarioEndpoints.bulkGenerate, {
    items: drafts.map((draft) => ({
      message: draft,
    })),
  });

  return mapBulkScenarioSubmission(scenarioGenerateSubmissionResponseSchema.parse(response.data));
}
