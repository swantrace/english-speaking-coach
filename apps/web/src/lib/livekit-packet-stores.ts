import type { GoalProgressPacket, UiUpdatePacket } from "@english-coach/contract";
import { useSyncExternalStore } from "react";

type GoalProgressState = GoalProgressPacket | null;

type ObservationState = {
  items: UiUpdatePacket[];
};

const emptyObservationState: ObservationState = {
  items: [],
};

const goalProgressListeners = new Set<() => void>();
const observationListeners = new Set<() => void>();
const goalProgressByRoom = new Map<string, GoalProgressState>();
const observationsByRoom = new Map<string, ObservationState>();

function emit(listeners: Set<() => void>) {
  for (const listener of listeners) {
    listener();
  }
}

export function seedGoalProgress(roomName: string, packet: GoalProgressPacket) {
  goalProgressByRoom.set(roomName, packet);
  emit(goalProgressListeners);
}

export function updateGoalProgress(roomName: string, packet: GoalProgressPacket) {
  goalProgressByRoom.set(roomName, packet);
  emit(goalProgressListeners);
}

export function resetGoalProgress(roomName: string) {
  goalProgressByRoom.delete(roomName);
  emit(goalProgressListeners);
}

export function appendObservation(roomName: string, packet: UiUpdatePacket) {
  const nextState = observationsByRoom.get(roomName) ?? emptyObservationState;

  observationsByRoom.set(roomName, {
    items: [...nextState.items, packet],
  });
  emit(observationListeners);
}

export function getObservationsSnapshot(roomName: string) {
  return observationsByRoom.get(roomName) ?? emptyObservationState;
}

export function resetObservations(roomName: string) {
  observationsByRoom.delete(roomName);
  emit(observationListeners);
}

export function useGoalProgress(roomName: string) {
  return useSyncExternalStore(
    (listener) => {
      goalProgressListeners.add(listener);

      return () => {
        goalProgressListeners.delete(listener);
      };
    },
    () => goalProgressByRoom.get(roomName) ?? null,
  );
}

export function useObservations(roomName: string) {
  return useSyncExternalStore(
    (listener) => {
      observationListeners.add(listener);

      return () => {
        observationListeners.delete(listener);
      };
    },
    () => getObservationsSnapshot(roomName),
  );
}
