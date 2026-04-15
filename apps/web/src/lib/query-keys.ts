export interface ScenarioListQueryKeyInput {
  search?: string;
  tags?: string[];
}

export interface HistoryListQueryKeyInput {
  search?: string;
  sessionType?: string;
}

function normalizeTextParam(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "";
}

function normalizeTagParams(tags?: string[]) {
  return [...new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean))].sort();
}

export function normalizeScenarioListQueryKeyInput(input: ScenarioListQueryKeyInput = {}) {
  return {
    search: normalizeTextParam(input.search),
    tags: normalizeTagParams(input.tags),
  };
}

export function normalizeHistoryListQueryKeyInput(input: HistoryListQueryKeyInput = {}) {
  return {
    search: normalizeTextParam(input.search),
    sessionType: normalizeTextParam(input.sessionType),
  };
}

export const queryKeys = {
  dashboard: {
    student: () => ["dashboard", "student"] as const,
  },
  history: {
    all: () => ["history"] as const,
    detail: (sessionId: string) => ["history", "detail", sessionId] as const,
    list: (input?: HistoryListQueryKeyInput) =>
      input ? (["history", "list", normalizeHistoryListQueryKeyInput(input)] as const) : (["history", "list"] as const),
  },
  scenarios: {
    detail: (scenarioId: string) => ["scenarios", "detail", scenarioId] as const,
    studentList: (input: ScenarioListQueryKeyInput = {}) =>
      ["scenarios", "student-list", normalizeScenarioListQueryKeyInput(input)] as const,
  },
  sessions: {
    liveBootstrap: (sessionId: string) => ["sessions", "live-bootstrap", sessionId] as const,
  },
};
