import { sessionTypeValues } from "@english-coach/domain";
import { z } from "zod";

const optionalSearchSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

export const sessionHistorySearchSchema = z.object({
  search: optionalSearchSchema,
  sessionType: z.enum(sessionTypeValues).optional(),
});

export type SessionHistorySearchParams = z.infer<typeof sessionHistorySearchSchema>;

export function parseSessionHistorySearch(search: Record<string, unknown>) {
  return sessionHistorySearchSchema.parse(search);
}

export function normalizeSessionHistorySearch(search: SessionHistorySearchParams) {
  return sessionHistorySearchSchema.parse(search);
}
