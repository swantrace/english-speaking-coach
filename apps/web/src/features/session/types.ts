import type { SelectedCharacterIndex, SessionType } from "@english-coach/domain";

export interface SessionLiveRouteTarget {
  params: {
    sessionId: string;
  };
  to: "/app/sessions/$sessionId/live";
}

export interface SessionBootstrapPayload {
  roomName: string;
  token: string;
}

export type SessionStartOrigin =
  | {
      scenarioId: string;
      selectedCharacterIndex: SelectedCharacterIndex;
      sessionType: "role-play";
    }
  | {
      content: string;
      summary: string;
      sessionType: "free-form";
    };

export interface SessionStartResult {
  bootstrap: SessionBootstrapPayload;
  liveRoute: SessionLiveRouteTarget;
  origin: SessionStartOrigin;
  sessionId: string;
  sessionType: SessionType;
}

export interface CreateRolePlaySessionFormInput {
  scenarioId: string;
  selectedCharacterIndex: SelectedCharacterIndex;
}

export interface CreateFreeFormSessionFormInput {
  content: string;
}

export interface SessionMutationError {
  message: string;
  status: number | null;
}

export interface FreeFormSessionFormValues {
  content: string;
}
