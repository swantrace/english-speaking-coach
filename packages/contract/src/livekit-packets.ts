import { z } from "zod";

/** Sent by the agent (role-play tool call) → web UI after each intent/slot detection. */
export const goalProgressPacketSchema = z.object({
  type: z.literal("goal-progress"),
  goals: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      optional: z.boolean().optional(),
      status: z.enum(["incomplete", "complete"]),
    }),
  ),
  currentGoalId: z.string(),
  /** slot name → extracted value */
  filledSlots: z.record(z.string(), z.string()),
});

/** Sent by the lingAnalysis worker → agent (free-form sessions only). */
export const workerFeedbackPacketSchema = z.object({
  type: z.literal("worker-feedback"),
  sessionHistoryId: z.string(),
  message: z.string(),
});

/** Sent by the lingAnalysis worker → web UI (free-form sessions only). */
export const uiUpdatePacketSchema = z.object({
  type: z.literal("ui-update"),
  sessionHistoryId: z.string(),
  observation: z.string(),
});

export type GoalProgressPacket = z.infer<typeof goalProgressPacketSchema>;
export type WorkerFeedbackPacket = z.infer<typeof workerFeedbackPacketSchema>;
export type UiUpdatePacket = z.infer<typeof uiUpdatePacketSchema>;
