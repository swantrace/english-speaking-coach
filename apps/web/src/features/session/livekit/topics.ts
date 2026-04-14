export const sessionPacketTopics = {
  goalProgress: "goal-progress",
  hint: "ui-update",
  system: "session-status",
} as const;

export type SessionPacketTopic = (typeof sessionPacketTopics)[keyof typeof sessionPacketTopics];
