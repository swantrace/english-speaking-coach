import {
  adminAiModelRequestDetailSchema,
  adminAiModelRequestListResponseSchema,
  adminAiModelRequestStatsResponseSchema,
} from "@english-coach/contract";
import axios from "axios";
import dayjs from "dayjs";
import { apiClient } from "@/lib/axios";
import { formatDateTime } from "@/lib/dates";
import { normalizeAdminAiRequestListQueryKeyInput } from "@/lib/query-keys";
import type {
  AdminAiRequestDetail,
  AdminAiRequestDetailView,
  AdminAiRequestListFilters,
  AdminAiRequestListItem,
  AdminAiRequestListItemView,
  AdminAiRequestListResponse,
  AdminAiRequestStatsMetricView,
  AdminAiRequestStatsResponse,
  AdminAiRequestStatsView,
} from "./types";

const ADMIN_AI_REQUESTS_ENDPOINT = "/api/admin/ai-model-requests";
const ADMIN_AI_REQUESTS_PAGE_SIZE = 20;

export function getAdminAiRequestsPageSize() {
  return ADMIN_AI_REQUESTS_PAGE_SIZE;
}

function formatOptionalNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "Unknown";
}

function formatLatency(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Not completed";
  }

  if (value < 1000) {
    return `${value} ms`;
  }

  return `${(value / 1000).toFixed(1)} s`;
}

function mapListItem(request: AdminAiRequestListItem): AdminAiRequestListItemView {
  return {
    ...request,
    completedAtLabel: request.completedAt ? formatDateTime(request.completedAt) : "Not completed",
    latencyLabel: formatLatency(request.latencyMs),
    modelLabel: `${request.providerId}/${request.modelId}`,
    startedAtLabel: formatDateTime(request.startedAt),
    tokenLabel: formatOptionalNumber(request.totalTokens),
  };
}

function createMetricCards(data: AdminAiRequestStatsResponse): AdminAiRequestStatsMetricView[] {
  const failureRate =
    data.summary.requests > 0 ? `${((data.summary.failedRequests / data.summary.requests) * 100).toFixed(1)}%` : "0%";

  return [
    {
      helperText: `${data.summary.successfulRequests.toLocaleString()} completed requests`,
      key: "requests",
      label: "Requests",
      value: data.summary.requests.toLocaleString(),
    },
    {
      helperText: `${data.summary.failedRequests.toLocaleString()} failed requests`,
      key: "failureRate",
      label: "Failure rate",
      value: failureRate,
    },
    {
      helperText: `${formatOptionalNumber(data.summary.tokenUsage.inputTokens)} input tokens`,
      key: "totalTokens",
      label: "Total tokens",
      value: formatOptionalNumber(data.summary.tokenUsage.totalTokens),
    },
    {
      helperText: `${formatOptionalNumber(data.summary.tokenUsage.reasoningTokens)} reasoning tokens`,
      key: "outputTokens",
      label: "Output tokens",
      value: formatOptionalNumber(data.summary.tokenUsage.outputTokens),
    },
    {
      helperText: `${formatOptionalNumber(data.summary.tokenUsage.cacheWriteTokens)} cache write tokens`,
      key: "cacheReadTokens",
      label: "Cache reads",
      value: formatOptionalNumber(data.summary.tokenUsage.cacheReadTokens),
    },
    {
      helperText: "Average completed request latency",
      key: "averageLatencyMs",
      label: "Avg latency",
      value: formatLatency(data.summary.averageLatencyMs),
    },
  ];
}

function mapStats(data: AdminAiRequestStatsResponse): AdminAiRequestStatsView {
  return {
    ...data,
    metrics: createMetricCards(data),
    trend: data.trend.map((point) => ({
      ...point,
      label: dayjs(point.date).format("MM-DD"),
    })),
  };
}

function mapDetail(data: AdminAiRequestDetail): AdminAiRequestDetailView {
  return {
    ...mapListItem(data),
    input: data.input,
    output: data.output,
    rawOutput: data.rawOutput,
    usage: data.usage,
  };
}

function createAdminAiRequestError(error: unknown, fallbackMessage: string) {
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

function pruneEmptyParams<TParams extends Record<string, unknown>>(params: TParams) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => !(typeof value === "string" && value.trim().length === 0)),
  );
}

export async function fetchAdminAiRequests(
  filters: AdminAiRequestListFilters = {},
): Promise<AdminAiRequestListResponse & { items: AdminAiRequestListItemView[] }> {
  try {
    const normalizedFilters = normalizeAdminAiRequestListQueryKeyInput(filters);
    const response = await apiClient.get(ADMIN_AI_REQUESTS_ENDPOINT, {
      params: pruneEmptyParams(normalizedFilters),
    });
    const data = adminAiModelRequestListResponseSchema.parse(response.data);

    return {
      ...data,
      items: data.items.map(mapListItem),
    };
  } catch (error) {
    throw createAdminAiRequestError(error, "The AI model request list could not be loaded.");
  }
}

export async function fetchAdminAiRequestStats(filters: AdminAiRequestListFilters = {}) {
  try {
    const {
      page: _page,
      pageSize: _pageSize,
      ...normalizedFilters
    } = normalizeAdminAiRequestListQueryKeyInput(filters);
    const response = await apiClient.get(`${ADMIN_AI_REQUESTS_ENDPOINT}/stats`, {
      params: pruneEmptyParams(normalizedFilters),
    });

    return mapStats(adminAiModelRequestStatsResponseSchema.parse(response.data));
  } catch (error) {
    throw createAdminAiRequestError(error, "AI model request stats could not be loaded.");
  }
}

export async function fetchAdminAiRequestDetail(requestId: string) {
  try {
    const response = await apiClient.get(`${ADMIN_AI_REQUESTS_ENDPOINT}/${requestId}`);

    return mapDetail(adminAiModelRequestDetailSchema.parse(response.data));
  } catch (error) {
    throw createAdminAiRequestError(error, "The AI model request detail could not be loaded.");
  }
}
