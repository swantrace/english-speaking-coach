import type { Scenario } from "@english-coach/contract";
import type { ExampleDialogueTurn, ScenarioDetail, ScenarioGoalView, ScenarioListItem } from "./types";

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
