import { submissionJobStatusValues, submissionKindValues } from "@english-coach/domain";
import { z } from "zod";
import { type AdminSubmissionSummary, adminSubmissionSummarySchema } from "../submissions/types";

const optionalSearchSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

export const adminJobStatusSchema = z.enum(submissionJobStatusValues);
export const adminJobKindSchema = z.enum(submissionKindValues);

export const adminJobListFiltersSchema = z.object({
  kind: adminJobKindSchema.optional(),
  search: optionalSearchSchema,
  status: adminJobStatusSchema.optional(),
});

export const adminJobRelatedEntitySchema = z.object({
  knowledgeItemId: z.string().nullable().optional(),
  scenarioId: z.string().nullable().optional(),
  sessionHistoryId: z.string().nullable().optional(),
});

export const adminJobListItemSchema = z
  .object({
    error: z.string().nullable().optional(),
    id: z.string().min(1).optional(),
    input: z.unknown().optional(),
    jobId: z.string().min(1),
    kind: adminJobKindSchema,
    message: z.string().nullable().optional(),
    output: z.unknown().optional(),
    processedAt: z.string().nullable().optional(),
    progress: z.number().min(0).max(100).optional(),
    queuedAt: z.string().min(1),
    status: adminJobStatusSchema,
    submissionId: z.string().min(1),
  })
  .merge(adminJobRelatedEntitySchema);

export const adminJobListResponseSchema = z.object({
  items: z.array(adminJobListItemSchema).default([]),
  submission: adminSubmissionSummarySchema.optional(),
  total: z.number().int().min(0),
});

export const adminJobDetailSchema = adminJobListItemSchema.extend({
  submission: adminSubmissionSummarySchema.optional(),
});

export const adminJobStreamEventSchema = z
  .object({
    error: z.string().nullable().optional(),
    input: z.unknown().optional(),
    jobId: z.string().min(1),
    kind: adminJobKindSchema.optional(),
    knowledgeItemId: z.string().nullable().optional(),
    message: z.string().nullable().optional(),
    output: z.unknown().optional(),
    processedAt: z.string().nullable().optional(),
    progress: z.number().min(0).max(100).optional(),
    queuedAt: z.string().optional(),
    scenarioId: z.string().nullable().optional(),
    sessionHistoryId: z.string().nullable().optional(),
    status: adminJobStatusSchema.optional(),
    submissionId: z.string().min(1),
    type: z.string().optional(),
  })
  .passthrough();

export type AdminJobStatus = z.infer<typeof adminJobStatusSchema>;
export type AdminJobKind = z.infer<typeof adminJobKindSchema>;
export type AdminJobListFilters = z.infer<typeof adminJobListFiltersSchema>;
export type AdminJobListResponse = z.infer<typeof adminJobListResponseSchema>;
export type AdminJobDetail = z.infer<typeof adminJobDetailSchema>;
export type AdminJobStreamEvent = z.infer<typeof adminJobStreamEventSchema>;

export interface AdminJobRelatedLinksView {
  knowledge?: {
    id: string;
    label: string;
    to: "/admin/knowledge/$knowledgeId/edit";
    params: { knowledgeId: string };
  };
  scenario?: {
    id: string;
    label: string;
    to: "/admin/scenarios/$scenarioId/edit";
    params: { scenarioId: string };
  };
  session?: {
    id: string;
    label: string;
    to: "/app/sessions/$sessionId";
    params: { sessionId: string };
  };
}

export interface AdminJobListItemView {
  error: string | null;
  id: string;
  input?: unknown;
  jobId: string;
  kind: AdminJobKind;
  kindLabel: string;
  message: string | null;
  output?: unknown;
  processedAt: string | null;
  processedAtLabel: string;
  progress: number;
  progressLabel: string;
  queuedAt: string;
  queuedAtLabel: string;
  relatedLinks: AdminJobRelatedLinksView;
  status: AdminJobStatus;
  submissionId: string;
}

export interface AdminJobListPageView {
  items: AdminJobListItemView[];
  submission?: AdminSubmissionSummaryView;
  total: number;
}

export interface AdminSubmissionSummaryView extends AdminSubmissionSummary {
  createdAtLabel: string;
  kindLabel: string;
  updatedAtLabel: string;
}

export interface AdminJobDetailView extends AdminJobListItemView {
  submission?: AdminSubmissionSummaryView;
}

export type JobStreamConnectionState = "closed" | "connecting" | "error" | "open";
