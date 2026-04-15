import { submissionKindValues } from "@english-coach/domain";
import { z } from "zod";

const optionalSearchSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

export const adminSubmissionKindSchema = z.enum(submissionKindValues);

export const adminSubmissionListFiltersSchema = z.object({
  kind: adminSubmissionKindSchema.optional(),
  search: optionalSearchSchema,
});

export const adminSubmissionSummarySchema = z.object({
  createdAt: z.string().min(1),
  id: z.string().min(1),
  kind: adminSubmissionKindSchema,
  totalCount: z.number().int().min(0),
  updatedAt: z.string().min(1),
  userId: z.string().nullable().optional(),
});

export const adminSubmissionListItemSchema = adminSubmissionSummarySchema.extend({
  completedJobs: z.number().int().min(0).optional(),
  failedJobs: z.number().int().min(0).optional(),
  queuedJobs: z.number().int().min(0).optional(),
  startedJobs: z.number().int().min(0).optional(),
});

export const adminSubmissionListResponseSchema = z.object({
  items: z.array(adminSubmissionListItemSchema).default([]),
  total: z.number().int().min(0),
});

export type AdminSubmissionKind = z.infer<typeof adminSubmissionKindSchema>;
export type AdminSubmissionListFilters = z.infer<typeof adminSubmissionListFiltersSchema>;
export type AdminSubmissionSummary = z.infer<typeof adminSubmissionSummarySchema>;
export type AdminSubmissionListResponse = z.infer<typeof adminSubmissionListResponseSchema>;

export interface AdminSubmissionListItemView extends AdminSubmissionSummary {
  completedJobs: number;
  createdAtLabel: string;
  failedJobs: number;
  kindLabel: string;
  queuedJobs: number;
  startedJobs: number;
  updatedAtLabel: string;
  userLabel: string;
}

export interface AdminSubmissionListPageView {
  items: AdminSubmissionListItemView[];
  total: number;
}
