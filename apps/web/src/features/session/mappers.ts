import type {
  CreateFreeFormSessionInput,
  CreateRolePlaySessionInput,
  CreateSessionResult,
} from "@english-coach/contract";
import type {
  CreateFreeFormSessionFormInput,
  CreateRolePlaySessionFormInput,
  LiveSessionBootstrap,
  LiveSessionBootstrapContract,
  LiveSessionPageViewModel,
  SessionGoalProgress,
  SessionLiveRouteTarget,
  SessionStartResult,
} from "./types";

const maximumSummaryLength = 140;

export function stripRichTextToPlainText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|ul|ol|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function createFreeFormSessionSummary(content: string) {
  const plainText = stripRichTextToPlainText(content);

  if (plainText.length <= maximumSummaryLength) {
    return plainText;
  }

  return `${plainText.slice(0, maximumSummaryLength - 3).trimEnd()}...`;
}

export function getSessionLiveRouteTarget(sessionId: string): SessionLiveRouteTarget {
  return {
    params: { sessionId },
    to: "/app/sessions/$sessionId/live",
  };
}

export function getSessionDetailRouteTarget(sessionId: string) {
  return {
    params: { sessionId },
    to: "/app/sessions/$sessionId" as const,
  };
}

export function mapRolePlaySessionFormInputToRequest(
  input: CreateRolePlaySessionFormInput,
): CreateRolePlaySessionInput {
  return {
    scenarioId: input.scenarioId,
    selectedCharacterIndex: input.selectedCharacterIndex,
    sessionType: "role-play",
  };
}

export function mapFreeFormSessionFormInputToRequest(
  input: CreateFreeFormSessionFormInput,
): CreateFreeFormSessionInput {
  return {
    contextDocument: input.content,
    sessionType: "free-form",
    summary: createFreeFormSessionSummary(input.content),
  };
}

export function mapRolePlaySessionResult(
  response: CreateSessionResult,
  input: CreateRolePlaySessionFormInput,
): SessionStartResult {
  return {
    bootstrap: {
      roomName: response.roomName,
      token: response.token,
    },
    liveRoute: getSessionLiveRouteTarget(response.sessionId),
    origin: {
      scenarioId: input.scenarioId,
      selectedCharacterIndex: input.selectedCharacterIndex,
      sessionType: "role-play",
    },
    sessionId: response.sessionId,
    sessionType: response.sessionType,
  };
}

export function mapFreeFormSessionResult(
  response: CreateSessionResult,
  input: CreateFreeFormSessionFormInput,
): SessionStartResult {
  return {
    bootstrap: {
      roomName: response.roomName,
      token: response.token,
    },
    liveRoute: getSessionLiveRouteTarget(response.sessionId),
    origin: {
      content: input.content,
      sessionType: "free-form",
      summary: createFreeFormSessionSummary(input.content),
    },
    sessionId: response.sessionId,
    sessionType: response.sessionType,
  };
}

export function mapLiveSessionBootstrap(response: LiveSessionBootstrapContract): LiveSessionBootstrap {
  if (response.sessionType === "role-play") {
    return {
      endedAt: response.endedAt,
      room: response.room,
      scenario: response.scenario,
      sessionId: response.sessionId,
      sessionType: response.sessionType,
      startedAt: response.startedAt,
    };
  }

  return {
    context: response.context,
    endedAt: response.endedAt,
    room: response.room,
    sessionId: response.sessionId,
    sessionType: response.sessionType,
    startedAt: response.startedAt,
  };
}

export function mapLiveSessionPageViewModel(bootstrap: LiveSessionBootstrap): LiveSessionPageViewModel {
  return {
    bootstrap,
    detailRoute: getSessionDetailRouteTarget(bootstrap.sessionId),
    title: bootstrap.sessionType === "role-play" ? bootstrap.scenario.title : bootstrap.context.summary,
  };
}

export function mapGoalProgressPacketToViewModel(packet: {
  currentGoalId: string;
  filledSlots: Record<string, string>;
  goals: Array<{
    description: string;
    id: string;
    optional?: boolean;
    status: "incomplete" | "complete";
  }>;
  transcriptTurnIndex?: number;
}): SessionGoalProgress {
  return {
    currentGoalId: packet.currentGoalId ?? null,
    filledSlots: packet.filledSlots,
    goals: packet.goals.map((goal) => ({
      description: goal.description,
      id: goal.id,
      optional: goal.optional ?? false,
      status: goal.status,
    })),
    transcriptTurnIndex: packet.transcriptTurnIndex ?? null,
  };
}
