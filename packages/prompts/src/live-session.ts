import type { ScenarioCharacter, ScenarioGoal } from "@english-coach/contract/scenario";

type LiveSessionGoal = Pick<ScenarioGoal, "description" | "id" | "logic" | "optional">;
type ActiveGoalSchemaGoal = Pick<ScenarioGoal, "description" | "id" | "logic">;
type LiveSessionCharacter = Pick<ScenarioCharacter, "description" | "name">;

export const buildFreeFormInstructionsPrompt = (context: string) => {
  return `
You are an English speaking coach for a live voice session.
Keep responses concise, practical, and easy to follow aloud.
Do not mention hidden analysis or worker feedback unless it improves the conversation naturally.
Use this context to ground the session:
${context}`;
};

export const workerFeedbackPrefix = "[WORKER_FEEDBACK]";

export const buildLatestWorkerFeedbackPrompt = (message: string) => {
  return `${workerFeedbackPrefix}
${message}`;
};

export const buildExtractionGuidanceSectionPrompt = ({ hasIncompleteGoals }: { hasIncompleteGoals: boolean }) => {
  return !hasIncompleteGoals
    ? [
        "All goals are complete.",
        "Do not call the tool again unless the learner clearly restarts or changes the task.",
        "Wrap up naturally in character.",
      ].join("\n")
    : [
        "Before composing every reply, compare the learner's latest turn with every required intent and slot in [TRACKABLE_GOALS].",
        "When the latest turn supplies any required evidence, call recordGoalEvidence before speaking; do not postpone tracking until a later turn.",
        "Submit one evidence item for every matching goal, including upcoming goals, in a single tool call.",
        "Within each evidence item, include every matching required intent and any available required slots from that learner turn.",
        "Use only exact goal IDs, intent names, and slot names from [TRACKABLE_GOALS].",
        "Extract slot values from natural wording, even when the learner does not say the slot name directly.",
        'Example: if goal `order` expects intent `orderDrink` and slot `drinkType`, and the learner says "May I have a cup of mocha?", submit { goalId: "order", intents: ["orderDrink"], slots: { drinkType: "mocha" } }.',
        "Do not mention intents, slots, tool calls, or progress tracking to the learner.",
      ].join("\n");
};

export const buildActiveGoalSchemaSectionPrompt = ({
  goals,
  completedGoalIds,
  currentGoalId,
}: {
  goals: ActiveGoalSchemaGoal[];
  completedGoalIds: Set<string>;
  currentGoalId: string | null;
}) => {
  const incompleteGoals = goals.filter((goal) => !completedGoalIds.has(goal.id));

  return incompleteGoals.length === 0
    ? "All goals are complete."
    : incompleteGoals
        .map((goal) =>
          [
            `Goal ID: ${goal.id}`,
            `Status: ${goal.id === currentGoalId ? "active" : "upcoming"}`,
            `Goal: ${goal.description}`,
            `Required intents: ${goal.logic.required_intents.join(", ") || "none"}`,
            `Required slots: ${goal.logic.required_slots.join(", ") || "none"}`,
          ].join("\n"),
        )
        .join("\n\n");
};

export const buildCurrentStatusSectionPrompt = ({
  currentGoal,
  goals,
  completedGoalIds,
  filledSlotsForCurrentGoal,
}: {
  currentGoal: LiveSessionGoal | null;
  goals: LiveSessionGoal[];
  completedGoalIds: Set<string>;
  filledSlotsForCurrentGoal: Record<string, string>;
}) => {
  if (!currentGoal) {
    return [
      "Goal progress:",
      "- All scenario goals are complete.",
      "- Stay in character and wrap up the role-play naturally.",
    ].join("\n");
  }

  const filledSlots = Object.entries(filledSlotsForCurrentGoal);
  const remainingSlots = currentGoal.logic.required_slots.filter(
    (slotName) => !(slotName in filledSlotsForCurrentGoal),
  );
  const filledSlotsText =
    filledSlots.length > 0
      ? filledSlots.map(([slotName, slotValue]) => `${slotName}="${slotValue}"`).join(", ")
      : "none";
  const remainingSlotsText = remainingSlots.length > 0 ? remainingSlots.join(", ") : "none";

  return [
    "Goal progress:",
    ...goals.map((goal) => {
      if (completedGoalIds.has(goal.id)) {
        return `- Complete: ${goal.description}`;
      }

      if (goal.id === currentGoal.id) {
        return `- Active: ${goal.description}`;
      }

      return `- Upcoming: ${goal.description}`;
    }),
    "",
    "Active goal state:",
    `- Filled slots: ${filledSlotsText}`,
    `- Remaining slots: ${remainingSlotsText}`,
  ].join("\n");
};

export const buildRolePlayInstructionsPrompt = ({
  userCharacter,
  agentCharacter,
  scenarioSetting,
  activeGoalSchema,
  extractionGuidance,
  currentStatus,
}: {
  userCharacter: LiveSessionCharacter;
  agentCharacter: LiveSessionCharacter;
  scenarioSetting: string;
  activeGoalSchema: string;
  extractionGuidance: string;
  currentStatus: string;
}) => {
  return `You are role-playing as ${agentCharacter.name}. ${agentCharacter.description}
The learner is playing as ${userCharacter.name}. ${userCharacter.description}
Scenario setting: ${scenarioSetting}

Stay in character at all times.
Help the learner complete the active goal through natural conversation, not by quizzing them mechanically.
Do not explain the goal system, slots, intents, tool calls, or hidden progress tracking to the learner.

[VOICE_STYLE]
- Output only what the character says aloud. Do not narrate actions, facial expressions, body language, scenery, or internal thoughts.
- Usually respond with one or two short sentences and no more than about 35 words.
- Ask at most one question, then yield the floor.
- Briefly acknowledge the learner without restating or summarizing their full answer.
- Sound like spontaneous conversation, not a written story, speech, lesson, or interview.

[TRACKABLE_GOALS]
${activeGoalSchema}

[TOOL_CALL_RULES]
${extractionGuidance}

[CURRENT_PROGRESS]
${currentStatus}

[RESPONSE_POLICY]
- Tool calls required by [TOOL_CALL_RULES] take priority over composing the spoken reply.
- If the active goal is incomplete, create a natural opportunity for one missing intent or slot at a time.
- If the active goal is complete, continue smoothly into the next goal.
- Do not close the conversation while required goals remain incomplete; redirect a premature goodbye with one brief in-character prompt.
- If all goals are complete, wrap up the role-play naturally in character.`;
};
