export interface ScenarioListQueryKeyInput {
  search?: string;
  tags?: string[];
}

export interface HistoryListQueryKeyInput {
  search?: string;
  sessionType?: string;
}

export interface KnowledgeListQueryKeyInput {
  search?: string;
}

export interface AdminKnowledgeListQueryKeyInput {
  communicativeFunction?: string;
  fixednessLevel?: string;
  reviewStatus?: string;
  search?: string;
  syntaxRole?: string;
}

export interface AdminOccurrenceListQueryKeyInput {
  search?: string;
  status?: string;
}

export interface AdminUserListQueryKeyInput {
  page?: number;
  pageSize?: number;
  role?: string;
  search?: string;
  status?: string;
}

export interface AdminScenarioListQueryKeyInput {
  reviewStatus?: string;
  search?: string;
  tags?: string[];
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

export function normalizeKnowledgeListQueryKeyInput(input: KnowledgeListQueryKeyInput = {}) {
  return {
    search: normalizeTextParam(input.search),
  };
}

export function normalizeAdminKnowledgeListQueryKeyInput(input: AdminKnowledgeListQueryKeyInput = {}) {
  return {
    communicativeFunction: normalizeTextParam(input.communicativeFunction),
    fixednessLevel: normalizeTextParam(input.fixednessLevel),
    reviewStatus: normalizeTextParam(input.reviewStatus),
    search: normalizeTextParam(input.search),
    syntaxRole: normalizeTextParam(input.syntaxRole),
  };
}

export function normalizeAdminOccurrenceListQueryKeyInput(input: AdminOccurrenceListQueryKeyInput = {}) {
  return {
    search: normalizeTextParam(input.search),
    status: normalizeTextParam(input.status),
  };
}

export function normalizeAdminUserListQueryKeyInput(input: AdminUserListQueryKeyInput = {}) {
  return {
    page: input.page ?? 1,
    pageSize: input.pageSize ?? 20,
    role: normalizeTextParam(input.role),
    search: normalizeTextParam(input.search),
    status: normalizeTextParam(input.status),
  };
}

export function normalizeAdminScenarioListQueryKeyInput(input: AdminScenarioListQueryKeyInput = {}) {
  return {
    reviewStatus: normalizeTextParam(input.reviewStatus),
    search: normalizeTextParam(input.search),
    tags: normalizeTagParams(input.tags),
  };
}

export const queryKeys = {
  admin: {
    dashboard: () => ["admin", "dashboard"] as const,
    knowledge: {
      all: () => ["admin", "knowledge"] as const,
      detail: (knowledgeId: string) => ["admin", "knowledge", "detail", knowledgeId] as const,
      list: (input: AdminKnowledgeListQueryKeyInput = {}) =>
        ["admin", "knowledge", "list", normalizeAdminKnowledgeListQueryKeyInput(input)] as const,
    },
    occurrences: {
      all: () => ["admin", "occurrences"] as const,
      list: (input: AdminOccurrenceListQueryKeyInput = {}) =>
        ["admin", "occurrences", "list", normalizeAdminOccurrenceListQueryKeyInput(input)] as const,
    },
    scenarios: {
      all: () => ["admin", "scenarios"] as const,
      detail: (scenarioId: string) => ["admin", "scenarios", "detail", scenarioId] as const,
      list: (input: AdminScenarioListQueryKeyInput = {}) =>
        ["admin", "scenarios", "list", normalizeAdminScenarioListQueryKeyInput(input)] as const,
    },
    users: {
      all: () => ["admin", "users"] as const,
      list: (input: AdminUserListQueryKeyInput = {}) =>
        ["admin", "users", "list", normalizeAdminUserListQueryKeyInput(input)] as const,
    },
  },
  dashboard: {
    student: () => ["dashboard", "student"] as const,
  },
  history: {
    all: () => ["history"] as const,
    detail: (sessionId: string) => ["history", "detail", sessionId] as const,
    list: (input?: HistoryListQueryKeyInput) =>
      input ? (["history", "list", normalizeHistoryListQueryKeyInput(input)] as const) : (["history", "list"] as const),
  },
  knowledge: {
    all: () => ["knowledge"] as const,
    detail: (knowledgeId: string) => ["knowledge", "detail", knowledgeId] as const,
    list: (input?: KnowledgeListQueryKeyInput) =>
      input
        ? (["knowledge", "list", normalizeKnowledgeListQueryKeyInput(input)] as const)
        : (["knowledge", "list"] as const),
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
