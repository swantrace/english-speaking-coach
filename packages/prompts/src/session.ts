export const buildSessionReviewPrompt = () => ({
  system: "You are a helpful assistant for reviewing coaching sessions.",
  prompt: "Review the following coaching session and provide feedback: {input}",
});

export type InConversationAnalysisPromptTurn = {
  speaker: string;
  text: string;
  timestampMs: number;
  transcriptTurnIndex: number;
};

export const buildInConversationAnalysisPrompt = ({
  indexedTurns,
}: {
  indexedTurns: InConversationAnalysisPromptTurn[];
}) => {
  const transcriptText =
    indexedTurns.length === 0
      ? "NO TRANSCRIPT TURNS."
      : indexedTurns
          .map(
            (turn) =>
              `[${turn.transcriptTurnIndex}] ${turn.speaker.toUpperCase()} (${turn.timestampMs}ms): ${turn.text}`,
          )
          .join("\n");

  return {
    system: [
      "You are an expert English-speaking coach analyzing a live conversation while it is still happening.",
      "Your job is to return compact structured coaching signals for the UI, the voice agent, and later knowledge review.",
      "Be practical, specific, and lightweight. Do not over-explain.",
    ].join("\n"),
    prompt: [
      "[RECENT TRANSCRIPT]",
      "Turns are in chronological order. The number in brackets is transcriptTurnIndex.",
      "",
      transcriptText,
      "",
      "[TASK]",
      "Analyze these recent turns and return one object with:",
      "- up to 12 unresolved knowledge occurrences",
      "- up to 3 transcript-aligned learner-facing UI prompts",
      "- one short worker feedback message for the live voice agent",
      "",
      "[OUTPUT FIELDS]",
      "occurrences:",
      "- Extract useful reusable English patterns from user and assistant turns.",
      "- Include only occurrences whose transcriptTurnIndex points to a turn shown above.",
      "- Use speaker context implicitly: user turns are learner production; assistant turns are target language modeled by the coach.",
      '- proposedPattern must be concise reusable notation, for example: "I\'d like <np>", "Could you <vp>?", "Would it be possible to <vp>?".',
      "- utterance must be the exact or lightly trimmed phrase from that same transcript turn.",
      "- Prefer unresolved or newly useful language, not every phrase in the transcript.",
      "",
      "uiPrompts:",
      "- Always include uiPrompts. If there are no useful prompts, return [].",
      "- Each prompt must be brief and learner-facing, not a full explanation.",
      '- Phrase prompts like something the learner could ask next, for example: "Ask the agent why..." or "Ask how...".',
      '- Use promptKind="error_hint" for learner mistakes.',
      '- Use promptKind="knowledge_hint" for useful language patterns worth noticing.',
      '- Use promptKind="fluency_hint" for pacing, clarity, hesitation, or response-length cues.',
      "- Anchor transcriptTurnIndex to the most relevant turn whenever possible.",
      "",
      "workerFeedbackMessage:",
      "- Write one compact coaching hint for the agent to append into chat context.",
      "- Focus on what the agent should do next in the live conversation.",
      "- Keep it natural, actionable, and short.",
      "",
      "[CONSTRAINTS]",
      "- Return only data matching the required structured schema.",
      "- Do not include markdown, prose outside fields, or extra keys.",
      "- Do not invent transcriptTurnIndex values.",
      "- Do not correct assistant turns as learner mistakes.",
      "- Do not shame the learner; keep feedback warm and useful.",
    ].join("\n"),
  };
};

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
  currentGoal: {
    logic: {
      required_intents: string[];
      required_slots: string[];
    };
  } | null;
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

export const buildActiveGoalSchemaSectionPrompt = ({
  currentGoal,
}: {
  currentGoal: { description: string; logic: { required_intents: string[]; required_slots: string[] } } | null;
}) => {
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
  currentGoal: {
    description: string;
    id: string;
    logic: {
      required_intents: string[];
      required_slots: string[];
    };
    optional?: boolean | undefined;
  } | null;
  goals: {
    description: string;
    id: string;
    logic: {
      required_intents: string[];
      required_slots: string[];
    };
    optional?: boolean | undefined;
  }[];
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
  userCharacter: { description: string; name: string };
  agentCharacter: { description: string; name: string };
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
