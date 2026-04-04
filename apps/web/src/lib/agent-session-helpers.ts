import type { GoalProgressPacket, SessionTurn, UiUpdatePacket } from "@english-coach/contract";

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
  turnIndex: number;
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
        turnIndex: index,
      },
    ];
  });
}

export function getTranscriptEntriesFromSessionTurns(turns: SessionTurn[]) {
  return turns.map<TranscriptEntry>((turn, index) => ({
    id: `turn-${index}`,
    message: turn.text,
    speaker: turn.speaker === "agent" ? "assistant" : "user",
    timestamp: normalizeTimestamp(turn.timestampMs),
    turnIndex: index,
  }));
}

function getAnchorEntries(entries: TranscriptEntry[]) {
  const userEntries = entries.filter((entry) => entry.speaker === "user");

  return userEntries.length ? userEntries : entries;
}

function getEntryByTurnIndex(entries: TranscriptEntry[], transcriptTurnIndex?: number) {
  if (transcriptTurnIndex === undefined) {
    return null;
  }

  return entries.find((entry) => entry.turnIndex === transcriptTurnIndex) ?? null;
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
    const goalAnchor =
      getEntryByTurnIndex(entries, goalProgress.transcriptTurnIndex) ??
      getAnchorEntries(entries).at(-1) ??
      entries.at(-1);
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
      const anchor =
        getEntryByTurnIndex(entries, observation.transcriptTurnIndex) ??
        anchorEntries.at(index) ??
        anchorEntries.at(-1) ??
        entries.at(-1);

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

export function createHistoryTranscriptCueMap({
  completedGoals,
  entries,
  errors,
  scenarioGoals,
}: {
  completedGoals?: string[] | null;
  entries: TranscriptEntry[];
  errors: Array<{ errorDescription: string; suggestion: string; utterance: string }>;
  scenarioGoals?: Array<{ description: string; id: string }>;
}) {
  const cuesById: Record<string, TranscriptCue[]> = {};

  if (!entries.length) {
    return cuesById;
  }

  if (completedGoals?.length && scenarioGoals?.length) {
    const completedGoalDescriptions = scenarioGoals
      .filter((goal) => completedGoals.includes(goal.id))
      .map((goal) => goal.description);
    const latestUserEntry = getAnchorEntries(entries).at(-1) ?? entries.at(-1);

    if (latestUserEntry && completedGoalDescriptions.length) {
      cuesById[latestUserEntry.id] = [
        ...(cuesById[latestUserEntry.id] ?? []),
        {
          kind: "goal-progress",
          text: `Completed goals: ${completedGoalDescriptions.join(" · ")}`,
        },
      ];
    }
  }

  for (const error of errors) {
    const matchingEntry = entries.find(
      (entry) =>
        entry.speaker === "user" &&
        (entry.message.includes(error.utterance) || error.utterance.includes(entry.message)),
    );

    if (!matchingEntry) {
      continue;
    }

    cuesById[matchingEntry.id] = [
      ...(cuesById[matchingEntry.id] ?? []),
      {
        kind: "coaching",
        text: `${error.errorDescription} Ask about: ${error.suggestion}`,
      },
    ];
  }

  return cuesById;
}

export function formatAgentStateLabel(value: string) {
  return value.replaceAll("-", " ").replaceAll("_", " ");
}
