import type { Scenario, ScenarioReviewStatus, ScenarioSource } from "@english-coach/contract";
import { adminScenarioCreateSchema } from "@english-coach/contract/scenario-generate";

export type ScenarioFormDraft = {
  charactersJson: string;
  exampleDialogueJson: string;
  goalsJson: string;
  reviewStatus: ScenarioReviewStatus;
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
    reviewStatus: "approved",
    setting: "",
    title: "",
  };
}

export function createDraftFromScenario(scenario: Scenario): ScenarioFormDraft {
  return {
    charactersJson: toPrettyJson(scenario.characters),
    exampleDialogueJson: toPrettyJson(scenario.exampleDialogue),
    goalsJson: toPrettyJson(scenario.goals),
    reviewStatus: scenario.reviewStatus,
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
    reviewStatus: draft.reviewStatus,
    setting: draft.setting,
    title: draft.title,
  });

  if (!parsedDraft.success) {
    throw new Error(parsedDraft.error.issues[0]?.message ?? "Scenario form is invalid.");
  }

  return parsedDraft.data;
}

export function getReviewBadgeClassName(reviewStatus: ScenarioReviewStatus) {
  if (reviewStatus === "approved") {
    return "border-emerald-300 bg-emerald-100 text-emerald-900";
  }

  if (reviewStatus === "rejected") {
    return "border-rose-300 bg-rose-100 text-rose-900";
  }

  return "border-amber-300 bg-amber-100 text-amber-900";
}

export function getSourceBadgeClassName(source: ScenarioSource) {
  if (source === "admin") {
    return "border-cyan-300 bg-cyan-100 text-cyan-900";
  }

  return "border-violet-300 bg-violet-100 text-violet-900";
}
