// src/agent/prompts/session-analysis/builder.ts

// import { buildJsonOutputConstraints, buildMultiWordPhraseGuidelines, getLevelDescription } from "../helper";
// import type { BuildSessionAnalysisPromptParams } from "./schema";

// export function buildSessionAnalysisPrompt(params: BuildSessionAnalysisPromptParams): {
// 	system: string;
// 	prompt: string;
// } {
// 	const { scenario, session, transcript, learnerLevel } = params;

// 	const levelDescription = getLevelDescription(learnerLevel);

// 	const transcriptText =
// 		transcript.length === 0
// 			? "NO TRANSCRIPT MESSAGES."
// 			: transcript.map((turn, index) => `${index + 1}. ${turn.role.toUpperCase()}: ${turn.content}`).join("\n");

// 	const system = `You are an experienced English teacher analyzing a learner's role-play conversation.
// Your job is to produce a structured analysis JSON that can be stored in the database
// and later used by the learner and by a follow-up free-form tutor.

// The learner is approximately ${levelDescription}.
// Write all analysis in clear, simple English. Avoid jargon. Be specific and practical.`;

// 	const prompt = `[SCENARIO]
// Title: ${scenario.title}
// Description: ${scenario.description}

// [SESSION SNAPSHOT]
// Initial goals (the scenario's learning objectives):
// ${JSON.stringify(session.goals, null, 2)}

// Initial target knowledge points (KPs):
// ${JSON.stringify(session.targetKps, null, 2)}

// [TRANSCRIPT]
// The following is the complete transcript of the role-play session.
// Messages are in chronological order:

// ${transcriptText}

// [TASK]
// Based on the scenario, goals, target KPs, and the full transcript, analyze the learner's performance and produce ONE JSON object matching exactly the following structure:

// {
//   "summary": string,
//   "corrections": [
//     { "original": string, "correction": string, "explanation": string }
//   ],
//   "newlyDiscoveredKps": [
//     { "phrase": string, "explanation": string }
//   ],
//   "patternIssues": string[]
// }

// Field definitions and guidelines:

// 1. summary (string)
//    - 2-4 sentences.
//    - Briefly describe what happened in the role-play and how well the learner performed overall.
//    - Include both positive observations and areas for improvement.

// 2. corrections ({ original, correction, explanation }[])
//    - 5-15 specific corrections. THIS IS THE MOST IMPORTANT FIELD.
//    - Focus on mistakes, unnatural phrasing, or better alternatives.
//    - "original": The exact (or slightly trimmed) sentence/phrase the learner said.
//    - "correction": The natural, native way to express the same meaning.
//    - "explanation": Brief explanation of why the correction is better.
//      - Mention grammar, tone, word choice, collocation, or cultural appropriateness.
//      - Keep it simple and practical (10-30 words).
//    - Per-turn rule: At most ONE correction per learner (USER) turn.
//      - Fallback: If a holistic rewrite is ambiguous or the turn is extremely long, select the most impactful segment and provide ONE natural rewrite for that segment.
//      - Holistic rewrite: Prefer providing ONE corrected rewrite that resolves ALL issues in that learner turn while preserving the original intent.
//        - Naturalness first: Prefer idiomatic, native-like phrasing over minimal edits when it clearly improves clarity and naturalness.
//        - Keep meaning intact and avoid introducing new information.
//      - Optionally mention lesser issues inside the explanation, but do NOT add extra correction items for the same turn.
//    - Strict anchoring:
//      - "original" must come verbatim (or lightly trimmed) from exactly ONE USER turn.
//      - Do not combine text across turns; do not correct ASSISTANT turns.
//    - Prioritize:
//      - Clear errors (grammar, vocabulary mistakes)
//      - Unnatural phrasing that native speakers wouldn't use
//      - Better alternatives that sound more natural or appropriate
//    - Examples:
//      - original: "I want coffee"
//        correction: "I'd like a coffee, please"
//        explanation: "More polite and natural for service situations. 'I'd like' is softer than 'I want', and adding 'please' shows courtesy."

// 3. newlyDiscoveredKps ({ phrase, explanation }[])
//    - ${buildMultiWordPhraseGuidelines("discovery")}

// 4. patternIssues (string[])
//    - 0-3 high-level recurring problems (if you notice clear patterns).
//    - Only include if you see the SAME type of error multiple times.
//    - Each item should describe a systemic issue, not a one-time mistake.
//    - Examples:
//      - "Frequently drops articles ('a', 'the') before nouns"
//      - "Inconsistent past tense usage - mixes past and present"
//      - "Tends to use overly formal language in casual situations"
//      - "Often translates word-for-word from native language structure"
//    - Leave empty ([]) if no clear patterns emerge.

// [CONSTRAINTS]
// ${buildJsonOutputConstraints(["summary", "corrections", "newlyDiscoveredKps", "patternIssues"])}
// - All arrays must be present (use [] if empty).
// - Focus on ACTIONABLE, SPECIFIC feedback that helps the learner improve.
//  - The "corrections" field is the most valuable - be thorough and precise.
//  - Do NOT correct the same learner (USER) turn more than once. Choose the single best correction for that turn.`;

// 	return { system, prompt };
// }

export const buildSessionReviewPrompt = () => ({
  system: "You are a helpful assistant for reviewing coaching sessions.",
  prompt: "Review the following coaching session and provide feedback: {input}",
});

export const buildInConversationAnalysisPrompt = () => ({
  system: "You are a helpful assistant for analyzing in-conversation interactions.",
  prompt: "Analyze the following conversation and provide insights: {input}",
});

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
