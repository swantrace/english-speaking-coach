import type {
  CoachingPromptKind,
  LiveSessionBootstrap as ContractLiveSessionBootstrap,
  EndSessionResult,
  GoalProgressPacket,
} from "@english-coach/contract";
import type { SelectedCharacterIndex, SessionType, Speaker } from "@english-coach/domain";

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

export interface LiveSessionRoomConnection {
  roomName: string;
  serverUrl: string;
  token: string;
}

export interface RolePlayScenarioSideContent {
  characters: [
    {
      description: string;
      name: string;
    },
    {
      description: string;
      name: string;
    },
  ];
  goals: Array<{
    description: string;
    id: string;
    optional: boolean;
  }>;
  id: string;
  imageUrl: string | null;
  selectedCharacterIndex: SelectedCharacterIndex;
  setting: string;
  title: string;
}

export interface FreeFormContextSideContent {
  content: string;
  summary: string;
}

export type LiveSessionBootstrap =
  | {
      endedAt: string | null;
      room: LiveSessionRoomConnection;
      scenario: RolePlayScenarioSideContent;
      sessionId: string;
      sessionType: "role-play";
      startedAt: string;
    }
  | {
      context: FreeFormContextSideContent;
      endedAt: string | null;
      room: LiveSessionRoomConnection;
      sessionId: string;
      sessionType: "free-form";
      startedAt: string;
    };

export type LiveSessionConnectionStatus = "connecting" | "connected" | "reconnecting" | "disconnected" | "error";

export type TranscriptTurnStatus = "partial" | "final";

export interface SessionTranscriptTurn {
  id: string;
  order: number;
  speaker: Speaker;
  speakerLabel: string;
  status: TranscriptTurnStatus;
  text: string;
  timestampMs: number;
}

export interface SessionHint {
  attachedTurnId: string | null;
  id: string;
  kind: CoachingPromptKind;
  label: string;
  text: string;
  timestampMs: number;
  transcriptTurnIndex: number | null;
}

export interface SessionGoalProgressItem {
  description: string;
  id: string;
  optional: boolean;
  status: "incomplete" | "complete";
}

export interface SessionGoalProgress {
  currentGoalId: string | null;
  filledSlots: Record<string, string>;
  goals: SessionGoalProgressItem[];
  transcriptTurnIndex: number | null;
}

export interface LiveSessionPageViewModel {
  bootstrap: LiveSessionBootstrap;
  detailRoute: {
    params: {
      sessionId: string;
    };
    to: "/app/sessions/$sessionId";
  };
  title: string;
}

export interface SessionRuntimeSnapshot {
  connectionError: string | null;
  connectionStatus: LiveSessionConnectionStatus;
  currentSessionId: string | null;
  endSessionDialogOpen: boolean;
  goalProgress: SessionGoalProgress | null;
  hints: SessionHint[];
  sidePanelOpen: boolean;
  turns: SessionTranscriptTurn[];
}

export interface SessionRuntimeState extends SessionRuntimeSnapshot {}

export interface SessionRuntimeActions {
  initializeSessionRuntime: (payload: { sessionId: string }) => void;
  resetSessionRuntime: () => void;
  setConnectionError: (message: string | null) => void;
  setConnectionStatus: (status: LiveSessionConnectionStatus) => void;
  setEndSessionDialogOpen: (open: boolean) => void;
  setGoalProgress: (progress: SessionGoalProgress | null) => void;
  setSidePanelOpen: (open: boolean) => void;
  upsertHint: (hint: SessionHint) => void;
  upsertTranscriptTurn: (turn: SessionTranscriptTurn) => void;
}

export type SessionRuntimeStore = SessionRuntimeState & SessionRuntimeActions;

export interface TranscriptTurnView extends SessionTranscriptTurn {
  hints: SessionHint[];
}

export type LiveSessionBootstrapContract = ContractLiveSessionBootstrap;
export type SessionEndMutationResult = EndSessionResult;
export type RolePlayGoalProgressPacket = GoalProgressPacket;
