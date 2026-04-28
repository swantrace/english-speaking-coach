import type { ScenarioCharacter, ScenarioGoal } from "@english-coach/contract/scenario";

type LiveSessionGoal = Pick<ScenarioGoal, "description" | "id" | "logic" | "optional">;
type ActiveGoalSchemaGoal = Pick<ScenarioGoal, "description" | "logic">;
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

export const buildHintSectionPrompt = ({
  intent,
  filledSlotSummary,
  currentGoalDescription,
  remainingSlots,
}: {
  intent: string;
  filledSlotSummary: string;
  currentGoalDescription: string;
  remainingSlots: string[];
}) => {
  const intentLine = filledSlotSummary
    ? `Detected intent: ${intent} with filled slots: ${filledSlotSummary}.`
    : `Detected intent: ${intent} with no filled slots.`;

  const nextLine =
    remainingSlots.length > 0
      ? `Next: guide the learner toward ${remainingSlots.join(", ")}.`
      : `Next: move the role-play toward goal '${currentGoalDescription}'.`;

  return `${intentLine}\n${nextLine}`;
};

export const buildExtractionGuidanceSectionPrompt = ({
  currentGoal,
}: {
  currentGoal: Pick<ScenarioGoal, "logic"> | null;
}) => {
  return !currentGoal
    ? [
        "All goals are complete.",
        "Do not call the tool again unless the learner clearly restarts or changes the task.",
        "Wrap up naturally in character.",
      ].join("\n")
    : [
        "Call detectIntentAndSlot when the learner makes meaningful progress on the active goal.",
        "Use only the exact intent and slot names from [ACTIVE_GOAL].",
        "Extract slot values from natural wording, even when the learner does not say the slot name directly.",
        'Example: if [ACTIVE_GOAL] expects intent `orderDrink` and slot `drinkType`, and the learner says "May I have a cup of mocha?", call the tool with intent `orderDrink` and slots { drinkType: "mocha" }.',
        "Do not mention intents, slots, tool calls, or progress tracking to the learner.",
      ].join("\n");
};

export const buildActiveGoalSchemaSectionPrompt = ({ currentGoal }: { currentGoal: ActiveGoalSchemaGoal | null }) => {
  return !currentGoal
    ? "All goals are complete."
    : [
        `Goal: ${currentGoal.description}`,
        `Required intents: ${currentGoal.logic.required_intents.join(", ") || "none"}`,
        `Required slots: ${currentGoal.logic.required_slots.join(", ") || "none"}`,
      ].join("\n");
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
Keep replies natural, concise, and suitable for live voice conversation.
Help the learner complete the active goal through natural conversation, not by quizzing them mechanically.
Do not explain the goal system, slots, intents, tool calls, or hidden progress tracking to the learner.

[ACTIVE_GOAL]
${activeGoalSchema}

[TOOL_CALL_RULES]
${extractionGuidance}

[CURRENT_PROGRESS]
${currentStatus}

[RESPONSE_POLICY]
- If the learner gives information needed for the active goal, call the tool before continuing.
- If required slots remain, naturally guide the learner toward one missing slot at a time.
- If the active goal is complete, continue smoothly into the next goal.
- If all goals are complete, wrap up the role-play naturally in character.`;
};
