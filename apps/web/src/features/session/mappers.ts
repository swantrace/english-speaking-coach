import type {
  CreateFreeFormSessionInput,
  CreateRolePlaySessionInput,
  CreateSessionResult,
  HistoryDetailResponse,
  HistorySummary,
} from "@english-coach/contract";
import { getDurationSeconds } from "@/lib/dates";
import type {
  CreateFreeFormSessionFormInput,
  CreateRolePlaySessionFormInput,
  LiveSessionBootstrap,
  LiveSessionBootstrapContract,
  LiveSessionPageViewModel,
  SessionGoalProgress,
  SessionHistoryDetailView,
  SessionHistoryListItemView,
  SessionLiveRouteTarget,
  SessionStartResult,
  SessionTranscriptReviewTurn,
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

function getSpeakerLabel(speaker: SessionTranscriptReviewTurn["speaker"]) {
  return speaker === "user" ? "You" : "Coach";
}

function mapTranscriptTurns(
  turns: HistoryDetailResponse["transcript"],
  rewrittenTurns: HistoryDetailResponse["rewrittenTranscript"],
): {
  originalTranscript: SessionTranscriptReviewTurn[];
  refinedTranscript: SessionTranscriptReviewTurn[] | null;
} {
  const rewrittenTurnsByIndex = new Map(rewrittenTurns.map((turn) => [turn.transcriptTurnIndex, turn.text] as const));
  const originalTranscript = turns.map((turn, index) => ({
    id: `turn-${index}`,
    isRewritten: false,
    order: index + 1,
    speaker: turn.speaker,
    speakerLabel: getSpeakerLabel(turn.speaker),
    text: turn.text,
  }));

  if (rewrittenTurnsByIndex.size === 0) {
    return {
      originalTranscript,
      refinedTranscript: null,
    };
  }

  return {
    originalTranscript,
    refinedTranscript: turns.map((turn, index) => {
      const rewrittenText = rewrittenTurnsByIndex.get(index);

      return {
        id: `turn-${index}`,
        isRewritten: typeof rewrittenText === "string" && rewrittenText !== turn.text,
        order: index + 1,
        speaker: turn.speaker,
        speakerLabel: getSpeakerLabel(turn.speaker),
        text: rewrittenText ?? turn.text,
      };
    }),
  };
}

export function mapSessionHistoryListItem(item: HistorySummary): SessionHistoryListItemView {
  return {
    date: item.endedAt ?? item.startedAt,
    durationSeconds: getDurationSeconds(item.startedAt, item.endedAt),
    id: item.id,
    sessionType: item.sessionType,
    title: item.title,
  };
}

export function mapSessionHistoryDetail(detail: HistoryDetailResponse): SessionHistoryDetailView {
  const { originalTranscript, refinedTranscript } = mapTranscriptTurns(detail.transcript, detail.rewrittenTranscript);

  return {
    contextDocument: detail.contextDocument ?? null,
    date: detail.session.endedAt ?? detail.session.startedAt,
    durationSeconds: getDurationSeconds(detail.session.startedAt, detail.session.endedAt),
    endedAt: detail.session.endedAt,
    errors: detail.errors.map((error) => ({
      description: error.errorDescription,
      dimension: error.dimension,
      id: error.id,
      suggestion: error.suggestion,
      transcriptTurnLabel:
        error.matchedTranscriptTurnIndex === null ? null : `Turn ${error.matchedTranscriptTurnIndex + 1}`,
      utterance: error.utterance,
    })),
    id: detail.session.id,
    knowledgeItems: detail.knowledgeItems.map((item) => ({
      count: item.count,
      examples: item.examples,
      id: item.id,
      knowledgeItemId: item.knowledgeItemId,
      occurrences: item.occurrences.map((occurrence) => ({
        excerpt: occurrence.excerpt,
        id: occurrence.id,
        occurrenceCount: occurrence.occurrenceCount,
        speaker: occurrence.speaker,
        transcriptTurnIndex: occurrence.transcriptTurnIndex,
        transcriptTurnLabel: `Turn ${occurrence.transcriptTurnIndex + 1}`,
      })),
      pattern: item.pattern,
      speaker: item.speaker,
    })),
    originalTranscript,
    refinedTranscript: detail.session.sessionType === "role-play" ? refinedTranscript : null,
    scenarioSetting: detail.session.scenario?.setting ?? null,
    sessionType: detail.session.sessionType,
    startedAt: detail.session.startedAt,
    summary: {
      completedGoalsCount: detail.session.completedGoals?.length ?? 0,
      errorsCount: detail.errors.length,
      knowledgeItemsCount: detail.knowledgeItems.length,
      reviewMarkdown: detail.session.review ?? "No written review is available for this session yet.",
      transcriptTurnsCount: detail.transcript.length,
    },
    title: detail.session.title,
  };
}
