export interface ScenarioListQueryKeyInput {
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

export const queryKeys = {
  dashboard: {
    student: () => ["dashboard", "student"] as const,
  },
  scenarios: {
    detail: (scenarioId: string) => ["scenarios", "detail", scenarioId] as const,
    studentList: (input: ScenarioListQueryKeyInput = {}) =>
      ["scenarios", "student-list", normalizeScenarioListQueryKeyInput(input)] as const,
  },
};
