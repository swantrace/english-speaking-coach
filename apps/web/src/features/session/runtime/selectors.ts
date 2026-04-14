import type { SessionRuntimeStore, TranscriptTurnView } from "../types";

export const selectConnectionBannerState = (state: SessionRuntimeStore) => ({
  error: state.connectionError,
  status: state.connectionStatus,
});

export const selectGoalProgress = (state: SessionRuntimeStore) => state.goalProgress;

export const selectRecentHints = (state: SessionRuntimeStore) =>
  [...state.hints].sort((left, right) => right.timestampMs - left.timestampMs).slice(0, 6);

export const selectSessionChromeState = (state: SessionRuntimeStore) => ({
  connectionError: state.connectionError,
  connectionStatus: state.connectionStatus,
  endSessionDialogOpen: state.endSessionDialogOpen,
  sidePanelOpen: state.sidePanelOpen,
});

export const selectTranscriptTurns = (state: SessionRuntimeStore): TranscriptTurnView[] =>
  state.turns.map((turn) => ({
    ...turn,
    hints: state.hints.filter((hint) => hint.attachedTurnId === turn.id),
  }));
