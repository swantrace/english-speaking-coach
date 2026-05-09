import {
  type adminAiModelRequestDetailSchema,
  adminAiModelRequestListQuerySchema,
  type adminAiModelRequestListResponseSchema,
  type adminAiModelRequestStatsResponseSchema,
} from "@english-coach/contract";
import { z } from "zod";

const optionalSearchSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

export const adminAiRequestListFiltersSchema = adminAiModelRequestListQuerySchema.extend({
  modelId: optionalSearchSchema,
  operation: optionalSearchSchema,
  providerId: optionalSearchSchema,
  search: optionalSearchSchema,
});

export type AdminAiRequestStatus = z.infer<typeof adminAiModelRequestDetailSchema>["status"];
export type AdminAiRequestTokenUsage = z.infer<typeof adminAiModelRequestStatsResponseSchema>["summary"]["tokenUsage"];
export type AdminAiRequestListFilters = Partial<z.infer<typeof adminAiRequestListFiltersSchema>>;
export type AdminAiRequestListItem = z.infer<typeof adminAiModelRequestListResponseSchema>["items"][number];
export type AdminAiRequestListResponse = z.infer<typeof adminAiModelRequestListResponseSchema>;
export type AdminAiRequestDetail = z.infer<typeof adminAiModelRequestDetailSchema>;
export type AdminAiRequestStatsResponse = z.infer<typeof adminAiModelRequestStatsResponseSchema>;

export interface AdminAiRequestListItemView extends AdminAiRequestListItem {
  completedAtLabel: string;
  latencyLabel: string;
  modelLabel: string;
  startedAtLabel: string;
  tokenLabel: string;
}

export interface AdminAiRequestStatsMetricView {
  helperText: string;
  key: string;
  label: string;
  value: string;
}

export interface AdminAiRequestStatsView extends AdminAiRequestStatsResponse {
  metrics: AdminAiRequestStatsMetricView[];
  trend: Array<AdminAiRequestStatsResponse["trend"][number] & { label: string }>;
}

export interface AdminAiRequestDetailView extends AdminAiRequestListItemView {
  input?: unknown;
  output?: unknown;
  rawOutput?: unknown;
  usage?: unknown;
}
