import { scenarioPageResponseSchema, scenarioSchema } from "@english-coach/contract";
import { apiClient } from "@/lib/axios";
import { normalizeScenarioListQueryKeyInput } from "@/lib/query-keys";
import { isPracticeEligibleScenario, mapScenarioToDetail, mapScenarioToListItem } from "./mappers";
import type { ScenarioDetail, ScenarioListFilters, ScenarioListView } from "./types";

const LEARNER_SCENARIOS_ENDPOINT = "/api/learner/scenarios";
const SCENARIO_DETAIL_ENDPOINT = "/api/scenarios";
const STUDENT_SCENARIO_PAGE_SIZE = 100;

function scenarioMatchesTags(tags: string[], selectedTags: string[]) {
  if (selectedTags.length === 0) {
    return true;
  }

  const tagSet = new Set(tags);
  return selectedTags.every((tag) => tagSet.has(tag));
}

export async function fetchStudentScenarioList(filters: ScenarioListFilters = {}): Promise<ScenarioListView> {
  const normalizedFilters = normalizeScenarioListQueryKeyInput(filters);
  const response = await apiClient.get(LEARNER_SCENARIOS_ENDPOINT, {
    params: {
      page: 1,
      pageSize: STUDENT_SCENARIO_PAGE_SIZE,
      search: normalizedFilters.search || undefined,
      sortBy: "updatedAt",
      sortDirection: "desc",
    },
  });

  const data = scenarioPageResponseSchema.parse(response.data);
  const eligibleScenarios = data.items.filter(isPracticeEligibleScenario);
  const availableTags = [
    ...new Set(
      eligibleScenarios
        .flatMap((scenario) => scenario.tags)
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ].sort((left, right) => left.localeCompare(right));

  // Backend search exists today; tag filtering stays in the mapper layer until the learner list endpoint gains tag params.
  const filteredScenarios = eligibleScenarios.filter((scenario) =>
    scenarioMatchesTags(scenario.tags, normalizedFilters.tags),
  );

  return {
    availableTags,
    items: filteredScenarios.map(mapScenarioToListItem),
    total: filteredScenarios.length,
  };
}

export async function fetchStudentScenarioDetail(scenarioId: string): Promise<ScenarioDetail> {
  const response = await apiClient.get(`${SCENARIO_DETAIL_ENDPOINT}/${scenarioId}`);
  const data = scenarioSchema.parse(response.data);

  return mapScenarioToDetail(data);
}
