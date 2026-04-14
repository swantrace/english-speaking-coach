import { create } from "zustand";
import type { SessionRuntimeStore } from "../types";
import { createInitialSessionRuntimeState, createSessionRuntimeActions } from "./actions";

export const useSessionRuntimeStore = create<SessionRuntimeStore>()((...args) => ({
  ...createInitialSessionRuntimeState(),
  ...createSessionRuntimeActions(...args),
}));
