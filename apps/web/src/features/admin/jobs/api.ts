import axios from "axios";
import { apiClient } from "@/lib/axios";
import { formatDateTime } from "@/lib/dates";
import { normalizeAdminJobListQueryKeyInput } from "@/lib/query-keys";
import type { AdminSubmissionKind } from "../submissions/types";
import {
  type AdminJobDetail,
  type AdminJobDetailView,
  type AdminJobKind,
  type AdminJobListFilters,
  type AdminJobListItemView,
  type AdminJobListPageView,
  type AdminJobListResponse,
  type AdminJobRelatedLinksView,
  type AdminJobStatus,
  type AdminJobStreamEvent,
  type AdminSubmissionSummaryView,
  adminJobDetailSchema,
  adminJobListFiltersSchema,
  adminJobListResponseSchema,
} from "./types";

const adminJobEndpoints = {
  detail: (submissionId: string, jobId: string) => `/api/admin/submissions/${submissionId}/jobs/${jobId}`,
  list: (submissionId: string) => `/api/admin/submissions/${submissionId}/jobs`,
  stream: (submissionId: string) => `/api/admin/submissions/${submissionId}/stream`,
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

function formatJobKindLabel(kind: AdminJobKind) {
  return formatSubmissionKindLabel(kind);
}

function formatProgressLabel(progress: number, status: AdminJobStatus) {
  if (status === "completed") {
    return "100%";
  }

  return `${progress}%`;
}

function clampProgress(progress: number | undefined, status: AdminJobStatus) {
  if (status === "completed") {
    return 100;
  }

  if (typeof progress !== "number" || Number.isNaN(progress)) {
    return status === "failed" ? 0 : 0;
  }

  return Math.max(0, Math.min(100, Math.round(progress)));
}

function mapRelatedLinks(
  job: Pick<AdminJobDetail, "knowledgeItemId" | "scenarioId" | "sessionHistoryId">,
): AdminJobRelatedLinksView {
  return {
    knowledge: job.knowledgeItemId
      ? {
          id: job.knowledgeItemId,
          label: "Open knowledge item",
          params: { knowledgeId: job.knowledgeItemId },
          to: "/admin/knowledge/$knowledgeId/edit",
        }
      : undefined,
    scenario: job.scenarioId
      ? {
          id: job.scenarioId,
          label: "Open scenario",
          params: { scenarioId: job.scenarioId },
          to: "/admin/scenarios/$scenarioId/edit",
        }
      : undefined,
    session: job.sessionHistoryId
      ? {
          id: job.sessionHistoryId,
          label: "Open session",
          params: { sessionId: job.sessionHistoryId },
          to: "/app/sessions/$sessionId",
        }
      : undefined,
  };
}

function mapSubmissionSummary(submission?: AdminJobListResponse["submission"]): AdminSubmissionSummaryView | undefined {
  if (!submission) {
    return undefined;
  }

  return {
    ...submission,
    createdAtLabel: formatDateTime(submission.createdAt),
    kindLabel: formatSubmissionKindLabel(submission.kind),
    updatedAtLabel: formatDateTime(submission.updatedAt),
  };
}

export function mapAdminJobListItem(job: AdminJobDetail): AdminJobListItemView {
  const progress = clampProgress(job.progress, job.status);

  return {
    error: job.error ?? null,
    id: job.id ?? job.jobId,
    input: job.input,
    jobId: job.jobId,
    kind: job.kind,
    kindLabel: formatJobKindLabel(job.kind),
    message: job.message ?? null,
    output: job.output,
    processedAt: job.processedAt ?? null,
    processedAtLabel: job.processedAt ? formatDateTime(job.processedAt) : "Not processed yet",
    progress,
    progressLabel: formatProgressLabel(progress, job.status),
    queuedAt: job.queuedAt,
    queuedAtLabel: formatDateTime(job.queuedAt),
    relatedLinks: mapRelatedLinks(job),
    status: job.status,
    submissionId: job.submissionId,
  };
}

function mapAdminJobListResponse(data: AdminJobListResponse): AdminJobListPageView {
  return {
    items: data.items.map(mapAdminJobListItem),
    submission: mapSubmissionSummary(data.submission),
    total: data.total,
  };
}

function mapAdminJobDetailResponse(data: AdminJobDetail): AdminJobDetailView {
  return {
    ...mapAdminJobListItem(data),
    submission: mapSubmissionSummary(data.submission),
  };
}

function createAdminJobError(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const responseMessage =
      typeof error.response?.data === "object" &&
      error.response?.data &&
      "error" in error.response.data &&
      typeof error.response.data.error === "string"
        ? error.response.data.error
        : null;

    return new Error(responseMessage ?? fallbackMessage);
  }

  return error instanceof Error ? error : new Error(fallbackMessage);
}

export function mergeAdminJobWithStreamEvent(
  current: AdminJobListItemView | AdminJobDetailView,
  event: AdminJobStreamEvent,
): AdminJobListItemView | AdminJobDetailView {
  const nextStatus = event.status ?? current.status;
  const nextProgress = clampProgress(Math.max(current.progress, event.progress ?? current.progress), nextStatus);

  return {
    ...current,
    error: event.error ?? current.error,
    input: event.input ?? current.input,
    kind: event.kind ?? current.kind,
    kindLabel: formatJobKindLabel(event.kind ?? current.kind),
    message: event.message ?? current.message,
    output: event.output ?? current.output,
    processedAt: event.processedAt ?? current.processedAt,
    processedAtLabel: event.processedAt ? formatDateTime(event.processedAt) : current.processedAtLabel,
    progress: nextProgress,
    progressLabel: formatProgressLabel(nextProgress, nextStatus),
    queuedAt: event.queuedAt ?? current.queuedAt,
    queuedAtLabel: event.queuedAt ? formatDateTime(event.queuedAt) : current.queuedAtLabel,
    relatedLinks: mapRelatedLinks({
      knowledgeItemId: event.knowledgeItemId ?? current.relatedLinks.knowledge?.id,
      scenarioId: event.scenarioId ?? current.relatedLinks.scenario?.id,
      sessionHistoryId: event.sessionHistoryId ?? current.relatedLinks.session?.id,
    }),
    status: nextStatus,
  };
}

export function getAdminJobStreamPath(submissionId: string) {
  return adminJobEndpoints.stream(submissionId);
}

export async function fetchAdminSubmissionJobs(
  submissionId: string,
  filters: AdminJobListFilters = {},
): Promise<AdminJobListPageView> {
  try {
    const normalizedFilters = normalizeAdminJobListQueryKeyInput(filters);
    const query = adminJobListFiltersSchema.parse({
      kind: normalizedFilters.kind || undefined,
      search: normalizedFilters.search || undefined,
      status: normalizedFilters.status || undefined,
    });
    const response = await apiClient.get(adminJobEndpoints.list(submissionId), {
      params: query,
    });

    return mapAdminJobListResponse(adminJobListResponseSchema.parse(response.data));
  } catch (error) {
    throw createAdminJobError(error, "The jobs for this submission could not be loaded.");
  }
}

export async function fetchAdminSubmissionJobDetail(submissionId: string, jobId: string): Promise<AdminJobDetailView> {
  try {
    const response = await apiClient.get(adminJobEndpoints.detail(submissionId, jobId));

    return mapAdminJobDetailResponse(adminJobDetailSchema.parse(response.data));
  } catch (error) {
    throw createAdminJobError(error, "The job detail could not be loaded.");
  }
}
