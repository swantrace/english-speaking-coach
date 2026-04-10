import type { Scenario } from "@english-coach/contract";
import { adminScenarioCreateSchema } from "@english-coach/contract/scenario-generate";

export type ScenarioFormDraft = {
  charactersJson: string;
  exampleDialogueJson: string;
  goalsJson: string;
  setting: string;
  title: string;
};

function toPrettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function createEmptyScenarioDraft(): ScenarioFormDraft {
  return {
    charactersJson: toPrettyJson([
      { description: "The learner's role in the scene.", name: "Learner" },
      { description: "The scene partner the agent will play.", name: "Partner" },
    ]),
    exampleDialogueJson: toPrettyJson([
      { characterIndex: 1, text: "Hello. How can I help you today?" },
      { characterIndex: 0, text: "I need help with this situation." },
    ]),
    goalsJson: toPrettyJson({
      goals: [
        {
          description: "State the main request clearly",
          id: "state-request",
          logic: { required_intents: ["state_request"], required_slots: ["request_detail"] },
        },
      ],
      intents: ["state_request"],
      slots: ["request_detail"],
    }),
    setting: "",
    title: "",
  };
}

export function createDraftFromScenario(scenario: Scenario): ScenarioFormDraft {
  return {
    charactersJson: toPrettyJson(scenario.characters),
    exampleDialogueJson: toPrettyJson(scenario.exampleDialogue),
    goalsJson: toPrettyJson(scenario.goals),
    setting: scenario.setting,
    title: scenario.title,
  };
}

export function parseScenarioDraft(draft: ScenarioFormDraft) {
  let characters: unknown;
  let exampleDialogue: unknown;
  let goals: unknown;

  try {
    characters = JSON.parse(draft.charactersJson);
  } catch {
    throw new Error("Characters must be valid JSON.");
  }

  try {
    exampleDialogue = JSON.parse(draft.exampleDialogueJson);
  } catch {
    throw new Error("Example dialogue must be valid JSON.");
  }

  try {
    goals = JSON.parse(draft.goalsJson);
  } catch {
    throw new Error("Goals must be valid JSON.");
  }

  const parsedDraft = adminScenarioCreateSchema.safeParse({
    characters,
    exampleDialogue,
    goals,
    setting: draft.setting,
    title: draft.title,
  });

  if (!parsedDraft.success) {
    throw new Error(parsedDraft.error.issues[0]?.message ?? "Scenario form is invalid.");
  }

  return parsedDraft.data;
}
