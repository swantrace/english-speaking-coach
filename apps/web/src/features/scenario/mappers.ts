import type { Scenario } from "@english-coach/contract/scenario";
import { formatDate } from "@/lib/dates";
import { truncateText } from "@/lib/format";
import type {
  AdminScenarioDetailView,
  AdminScenarioListItemView,
  AdminScenarioWritePayload,
  BulkScenarioSubmissionView,
  ExampleDialogueTurn,
  ScenarioDetail,
  ScenarioFormValues,
  ScenarioGoalView,
  ScenarioListItem,
} from "./types";

function createId() {
  return crypto.randomUUID();
}

function normalizeTags(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

export function isPracticeEligibleScenario(scenario: Scenario) {
  // Student browsing stays conservative even if upstream filters evolve.
  return !scenario.deletedAt && !scenario.isPendingReview;
}

function mapGoal(goal: Scenario["goals"]["goals"][number]): ScenarioGoalView {
  return {
    description: goal.description,
    id: goal.id,
    optional: goal.optional ?? false,
    requiredIntents: goal.logic.required_intents,
    requiredSlots: goal.logic.required_slots,
  };
}

function mapExampleDialogueTurn(
  turn: Scenario["exampleDialogue"][number],
  characterNames: [string, string],
  index: number,
): ExampleDialogueTurn {
  return {
    characterIndex: turn.characterIndex,
    id: `${turn.characterIndex}-${index}`,
    speakerName: characterNames[turn.characterIndex],
    text: turn.text,
  };
}

export function mapScenarioToListItem(scenario: Scenario): ScenarioListItem {
  return {
    characterNames: [scenario.characters[0].name, scenario.characters[1].name],
    id: scenario.id,
    imageUrl: scenario.imageUrl ?? null,
    setting: scenario.setting,
    tags: normalizeTags(scenario.tags),
    title: scenario.title,
  };
}

export function mapScenarioToDetail(scenario: Scenario): ScenarioDetail {
  const characterNames: [string, string] = [scenario.characters[0].name, scenario.characters[1].name];

  return {
    characters: [
      {
        description: scenario.characters[0].description,
        index: 0,
        name: scenario.characters[0].name,
      },
      {
        description: scenario.characters[1].description,
        index: 1,
        name: scenario.characters[1].name,
      },
    ],
    exampleDialogue: scenario.exampleDialogue.map((turn, index) => mapExampleDialogueTurn(turn, characterNames, index)),
    goalDimensions: {
      intents: scenario.goals.intents,
      slots: scenario.goals.slots,
    },
    goals: scenario.goals.goals.map(mapGoal),
    id: scenario.id,
    imageUrl: scenario.imageUrl ?? null,
    setting: scenario.setting,
    tags: normalizeTags(scenario.tags),
    title: scenario.title,
  };
}

export function createEmptyScenarioFormValues(): ScenarioFormValues {
  return {
    characters: [
      { description: "", name: "" },
      { description: "", name: "" },
    ],
    exampleDialogue: [
      {
        characterIndex: 0,
        id: createId(),
        text: "",
      },
    ],
    goals: {
      goals: [
        {
          description: "",
          id: createId(),
          logic: {
            required_intents: [],
            required_slots: [],
          },
          optional: false,
        },
      ],
      intents: [],
      slots: [],
    },
    imageUrl: "",
    isPendingReview: true,
    setting: "",
    tags: [],
    title: "",
  };
}

export function mapScenarioToAdminListItem(scenario: Scenario): AdminScenarioListItemView {
  return {
    id: scenario.id,
    isPendingReview: scenario.isPendingReview,
    reviewStatus: scenario.isPendingReview ? "pendingReview" : "approved",
    settingPreview: truncateText(scenario.setting, 120),
    tags: normalizeTags(scenario.tags),
    title: scenario.title,
    updatedAt: scenario.updatedAt,
    updatedAtLabel: formatDate(scenario.updatedAt),
  };
}

export function mapScenarioToAdminDetail(scenario: Scenario): AdminScenarioDetailView {
  return {
    ...mapScenarioToDetail(scenario),
    createdAt: scenario.createdAt,
    createdAtLabel: formatDate(scenario.createdAt),
    isPendingReview: scenario.isPendingReview,
    reviewStatus: scenario.isPendingReview ? "pendingReview" : "approved",
    updatedAt: scenario.updatedAt,
    updatedAtLabel: formatDate(scenario.updatedAt),
  };
}

export function mapScenarioDetailToFormValues(scenario: AdminScenarioDetailView): ScenarioFormValues {
  return {
    characters: [
      {
        description: scenario.characters[0].description,
        name: scenario.characters[0].name,
      },
      {
        description: scenario.characters[1].description,
        name: scenario.characters[1].name,
      },
    ],
    exampleDialogue: scenario.exampleDialogue.map((turn) => ({
      characterIndex: turn.characterIndex,
      id: turn.id,
      text: turn.text,
    })),
    goals: {
      goals: scenario.goals.map((goal) => ({
        description: goal.description,
        id: goal.id,
        logic: {
          required_intents: goal.requiredIntents,
          required_slots: goal.requiredSlots,
        },
        optional: goal.optional,
      })),
      intents: scenario.goalDimensions.intents,
      slots: scenario.goalDimensions.slots,
    },
    imageUrl: scenario.imageUrl ?? "",
    isPendingReview: scenario.isPendingReview,
    setting: scenario.setting,
    tags: scenario.tags,
    title: scenario.title,
  };
}

export function mapScenarioFormValuesToAdminPayload(values: ScenarioFormValues): AdminScenarioWritePayload {
  return {
    characters: values.characters,
    exampleDialogue: values.exampleDialogue.map((turn) => ({
      characterIndex: turn.characterIndex,
      text: turn.text.trim(),
    })),
    goals: {
      goals: values.goals.goals.map((goal) => ({
        description: goal.description.trim(),
        id: goal.id.trim(),
        logic: {
          required_intents: normalizeTags(goal.logic.required_intents),
          required_slots: normalizeTags(goal.logic.required_slots),
        },
        optional: goal.optional,
      })),
      intents: normalizeTags(values.goals.intents),
      slots: normalizeTags(values.goals.slots),
    },
    imageUrl: values.imageUrl.trim() || null,
    isPendingReview: values.isPendingReview,
    setting: values.setting.trim(),
    tags: normalizeTags(values.tags),
    title: values.title.trim(),
  };
}

export function mapBulkScenarioSubmission(response: {
  submissionId: string;
  summary: {
    enqueueFailed: number;
    invalid: number;
    queued: number;
    total: number;
  };
}): BulkScenarioSubmissionView {
  return {
    enqueueFailedCount: response.summary.enqueueFailed,
    invalidCount: response.summary.invalid,
    kind: "scenario.generate",
    queuedCount: response.summary.queued,
    submissionId: response.submissionId,
    totalCount: response.summary.total,
  };
}
