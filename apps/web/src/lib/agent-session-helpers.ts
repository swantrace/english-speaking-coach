import type { GoalProgressPacket, UiUpdatePacket } from "@english-coach/contract";

export interface TranscriptMessageLike {
  from?: {
    isLocal?: boolean | null;
  } | null;
  id?: string | null;
  message?: string | null;
  timestamp?: Date | number | string | null;
}

export interface TranscriptEntry {
  id: string;
  message: string;
  speaker: "assistant" | "user";
  timestamp: Date | null;
}

export interface TranscriptCue {
  kind: "coaching" | "goal-progress";
  text: string;
}

function normalizeTimestamp(value: TranscriptMessageLike["timestamp"]) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number" || typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

export function getTranscriptEntries(messages: TranscriptMessageLike[]) {
  return messages.flatMap<TranscriptEntry>((message, index) => {
    const text = typeof message.message === "string" ? message.message.trim() : "";

    if (!text) {
      return [];
    }

    const timestamp = normalizeTimestamp(message.timestamp);

    return [
      {
        id: typeof message.id === "string" && message.id.length > 0 ? message.id : `message-${index}`,
        message: text,
        speaker: message.from?.isLocal ? "user" : "assistant",
        timestamp,
      },
    ];
  });
}

function getAnchorEntries(entries: TranscriptEntry[]) {
  const userEntries = entries.filter((entry) => entry.speaker === "user");

  return userEntries.length ? userEntries : entries;
}

export function createTranscriptCueMap({
  entries,
  goalProgress,
  observations,
}: {
  entries: TranscriptEntry[];
  goalProgress?: GoalProgressPacket | null;
  observations?: UiUpdatePacket[];
}) {
  const cuesById: Record<string, TranscriptCue[]> = {};

  if (!entries.length) {
    return cuesById;
  }

  if (goalProgress) {
    const goalAnchor = getAnchorEntries(entries).at(-1) ?? entries.at(-1);
    const currentGoal =
      goalProgress.goals.find((goal) => goal.id === goalProgress.currentGoalId) ??
      goalProgress.goals.find((goal) => goal.status === "incomplete");
    const latestCompletedGoal = [...goalProgress.goals].reverse().find((goal) => goal.status === "complete");
    const slotSummary = Object.entries(goalProgress.filledSlots)
      .map(([slot, value]) => `${slot}: ${value}`)
      .join(" · ");
    const goalCues: TranscriptCue[] = [];

    if (latestCompletedGoal) {
      goalCues.push({
        kind: "goal-progress",
        text: `Completed goal: ${latestCompletedGoal.description}`,
      });
    }

    if (currentGoal && currentGoal.status !== "complete") {
      goalCues.push({
        kind: "goal-progress",
        text: slotSummary
          ? `Current goal: ${currentGoal.description}. Captured ${slotSummary}.`
          : `Current goal: ${currentGoal.description}. Keep steering the conversation there.`,
      });
    }

    if (goalAnchor && goalCues.length) {
      cuesById[goalAnchor.id] = [...(cuesById[goalAnchor.id] ?? []), ...goalCues];
    }
  }

  if (observations?.length) {
    const anchorEntries = getAnchorEntries(entries);
    const recentObservations = observations.slice(-Math.max(anchorEntries.length, 1)).reverse();

    recentObservations.forEach((observation, index) => {
      const anchor = anchorEntries.at(index) ?? anchorEntries.at(-1) ?? entries.at(-1);

      if (!anchor) {
        return;
      }

      cuesById[anchor.id] = [
        ...(cuesById[anchor.id] ?? []),
        {
          kind: "coaching",
          text: observation.observation,
        },
      ];
    });
  }

  return cuesById;
}

export function formatAgentStateLabel(value: string) {
  return value.replaceAll("-", " ").replaceAll("_", " ");
}
