import type { SessionRuntimeStore, TranscriptTurnView } from "../types";

export const selectGoalProgress = (state: SessionRuntimeStore) => state.goalProgress;

export const selectHints = (state: SessionRuntimeStore) => state.hints;

export const selectConnectionError = (state: SessionRuntimeStore) => state.connectionError;

export const selectConnectionStatus = (state: SessionRuntimeStore) => state.connectionStatus;

export const selectTranscriptTurns = (state: SessionRuntimeStore) => state.turns;

export function mapTranscriptTurnViews({
  hints,
  turns,
}: Pick<SessionRuntimeStore, "hints" | "turns">): TranscriptTurnView[] {
  return turns.map((turn) => ({
    ...turn,
    hints: hints.filter((hint) => hint.attachedTurnId === turn.id),
  }));
}

export function mapRecentHints({ hints }: Pick<SessionRuntimeStore, "hints">) {
  return [...hints].sort((left, right) => right.timestampMs - left.timestampMs).slice(0, 6);
}
