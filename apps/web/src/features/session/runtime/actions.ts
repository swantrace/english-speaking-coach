import type { StateCreator } from "zustand";
import type {
  SessionHint,
  SessionRuntimeActions,
  SessionRuntimeState,
  SessionRuntimeStore,
  SessionTranscriptTurn,
} from "../types";

function sortTurns(turns: SessionTranscriptTurn[]) {
  return [...turns].sort((left, right) => {
    if (left.order === right.order) {
      return left.id.localeCompare(right.id);
    }

    return left.order - right.order;
  });
}

function resolveAttachedTurnId(turns: SessionTranscriptTurn[], hint: SessionHint) {
  if (hint.transcriptTurnIndex !== null) {
    return turns[hint.transcriptTurnIndex]?.id ?? null;
  }

  const latestUserTurn = [...turns].reverse().find((turn) => turn.speaker === "user");
  return latestUserTurn?.id ?? null;
}

export const createSessionRuntimeActions: StateCreator<SessionRuntimeStore, [], [], SessionRuntimeActions> = (
  set,
  get,
) => ({
  initializeSessionRuntime: ({ sessionId }) => {
    set({
      connectionError: null,
      connectionStatus: "connecting",
      currentSessionId: sessionId,
      goalProgress: null,
      hints: [],
      turns: [],
    });
  },
  resetSessionRuntime: () => {
    set({
      connectionError: null,
      connectionStatus: "connecting",
      currentSessionId: null,
      endSessionDialogOpen: false,
      goalProgress: null,
      hints: [],
      sidePanelOpen: false,
      turns: [],
    });
  },
  setConnectionError: (message) => {
    set({ connectionError: message });
  },
  setConnectionStatus: (status) => {
    set({ connectionStatus: status });
  },
  setEndSessionDialogOpen: (open) => {
    set({ endSessionDialogOpen: open });
  },
  setGoalProgress: (progress) => {
    set({ goalProgress: progress });
  },
  setSidePanelOpen: (open) => {
    set({ sidePanelOpen: open });
  },
  upsertHint: (hint) => {
    const { hints, turns } = get();
    const nextHint = {
      ...hint,
      attachedTurnId: hint.attachedTurnId ?? resolveAttachedTurnId(turns, hint),
    };
    const existingIndex = hints.findIndex((item) => item.id === hint.id);

    if (existingIndex >= 0) {
      const nextHints = [...hints];
      nextHints[existingIndex] = nextHint;
      set({ hints: nextHints });
      return;
    }

    set({
      hints: [...hints, nextHint].sort((left, right) => left.timestampMs - right.timestampMs),
    });
  },
  upsertTranscriptTurn: (turn) => {
    const state = get();
    const existingIndex = state.turns.findIndex((item) => item.id === turn.id);
    const nextTurns = [...state.turns];

    if (existingIndex >= 0) {
      nextTurns[existingIndex] = turn;
    } else {
      nextTurns.push(turn);
    }

    const sortedTurns = sortTurns(nextTurns);
    const nextHints = state.hints.map((hint) => ({
      ...hint,
      attachedTurnId: resolveAttachedTurnId(sortedTurns, hint),
    }));

    set({
      hints: nextHints,
      turns: sortedTurns,
    });
  },
});

export function createInitialSessionRuntimeState(): SessionRuntimeState {
  return {
    connectionError: null,
    connectionStatus: "connecting",
    currentSessionId: null,
    endSessionDialogOpen: false,
    goalProgress: null,
    hints: [],
    sidePanelOpen: false,
    turns: [],
  };
}
