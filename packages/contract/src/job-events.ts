import { z } from "zod";

export const jobEventsConnectedEvent = "connected";
export const jobEventsHeartbeatEvent = "heartbeat";
export const jobProgressStatuses = ["queued", "started", "completed", "failed"] as const;

export const jobProgressStatusSchema = z.enum(jobProgressStatuses);

export const jobProgressMessageSchema = z.object({
  error: z.string().optional(),
  jobId: z.string(),
  message: z.string(),
  processedAt: z.string().optional(),
  progress: z.number(),
  queuedAt: z.string().optional(),
  status: jobProgressStatusSchema,
});

export const jobEventsSubmissionSummarySchema = z.object({
  enqueueFailed: z.number(),
  invalid: z.number(),
  queued: z.number(),
  total: z.number(),
});

export const jobEventsSystemStatusSchema = z.enum([jobEventsConnectedEvent, jobEventsHeartbeatEvent]);

export const jobEventsSystemMessageSchema = z.object({
  channel: z.string(),
  status: jobEventsSystemStatusSchema,
});

export function createJobEventsSubmissionResponseSchema<TSubmissionResultSchema extends z.ZodTypeAny>(
  submissionResultSchema: TSubmissionResultSchema,
) {
  return z.object({
    eventsUrl: z.string(),
    results: z.array(submissionResultSchema),
    summary: jobEventsSubmissionSummarySchema,
  });
}

export function isTerminalJobProgressStatus(status: JobProgressStatus) {
  return status === "completed" || status === "failed";
}

export type JobProgressStatus = z.infer<typeof jobProgressStatusSchema>;
export type JobProgressMessage = z.infer<typeof jobProgressMessageSchema>;
export type JobEventsSubmissionSummary = z.infer<typeof jobEventsSubmissionSummarySchema>;
export type JobEventsSystemStatus = z.infer<typeof jobEventsSystemStatusSchema>;
export type JobEventsSystemMessage = z.infer<typeof jobEventsSystemMessageSchema>;
