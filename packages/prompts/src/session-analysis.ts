import type { SessionType } from "@english-coach/contract/session";

export const buildSessionReviewPrompt = () => ({
  system: "You are a helpful assistant for reviewing coaching sessions.",
  prompt: "Review the following coaching session and provide feedback: {input}",
});

type PromptModelParams = {
  modelId?: string;
  providerId?: string;
};

export const buildLingAnalysisPrompt = ({
  errorDimensions,
  sessionType,
  turns,
}: {
  errorDimensions: readonly string[];
  modelId?: string;
  providerId?: string;
  sessionType: SessionType;
  turns: unknown;
}) => {
  const transcriptTurns = Array.isArray(turns) ? turns : [];
  const transcriptText =
    transcriptTurns.length === 0
      ? "NO TRANSCRIPT TURNS."
      : transcriptTurns
          .map((turn, index) => {
            const typedTurn = turn as { speaker?: unknown; text?: unknown; timestampMs?: unknown };
            return `[${index}] ${String(typedTurn.speaker ?? "unknown").toUpperCase()} (${String(
              typedTurn.timestampMs ?? "unknown",
            )}ms): ${String(typedTurn.text ?? "")}`;
          })
          .join("\n");

  return {
    system: [
      "You are an experienced English teacher and applied linguistics analyst.",
      "You analyze completed coaching transcripts for learner-facing review and later knowledge review.",
      "Be specific, fair, and practical. Report only evidence-supported learner errors, durable language patterns, and useful rewrite suggestions.",
    ].join("\n"),
    prompt: [
      "[TASK]",
      "Analyze the completed English coaching session transcript.",
      sessionType === "role-play"
        ? "Return one combined structured object with learner errors, knowledge occurrences, rewritten user turns, and a markdown review."
        : "Return one combined structured object with learner errors, knowledge occurrences, an empty rewrittenUserTurns array, and a markdown review.",
      "",
      "[CONTROLLED VALUES]",
      `Valid error dimensions: ${errorDimensions.join(", ")}`,
      "",
      "[TRANSCRIPT]",
      "Turns are in chronological order. The number in brackets is transcriptTurnIndex.",
      "",
      transcriptText,
      "",
      "[GUIDELINES]",
      "- Do not invent error dimensions or combine them. Use syntactic for grammar errors, and choose either lexical or syntactic when an error could fit both.",
      "- Use speaker='user' for active learner production and speaker='assistant' for target language modelled by the coach.",
      "- Only report genuine learner errors for user utterances.",
      "- Do not report assistant wording as learner errors.",
      "- Extract useful reusable English patterns from user and assistant turns as occurrences.",
      "- Include only occurrences whose transcriptTurnIndex points to a turn shown above.",
      "- Use speaker context implicitly: user turns are learner production; assistant turns are target language modeled by the coach.",
      '- proposedPattern must be concise reusable notation, for example: "I\'d like <np>", "Could you <vp>?", "Would it be possible to <vp>?".',
      "- utterance must be the exact or lightly trimmed phrase from that same transcript turn.",
      "- Prefer meaningful language patterns, not every phrase in the transcript.",
      "- Always include occurrences. If there are no useful occurrences, return occurrences as [].",
      sessionType === "role-play"
        ? "- Always include rewrittenUserTurns. Rewrite only user turns that would improve the completed role-play. If there are no rewrites to suggest, return rewrittenUserTurns as []."
        : "- This is a free-form session where the coach may already have corrected the learner in later turns. Always return rewrittenUserTurns as []; do not rewrite or replace any transcript turn.",
      ...(sessionType === "role-play" ? ["- Keep rewrites faithful to the learner's intended meaning."] : []),
      "- Make the review concise, encouraging, and actionable.",
    ].join("\n\n"),
  };
};

export type InConversationAnalysisPromptTurn = {
  speaker: string;
  text: string;
  timestampMs: number;
  transcriptTurnIndex: number;
};

export const buildInConversationAnalysisPrompt = ({
  indexedTurns,
}: PromptModelParams & {
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
      "- up to 3 transcript-aligned learner-facing UI prompts",
      "- one short worker feedback message for the live voice agent",
      "",
      "[OUTPUT FIELDS]",
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
      "[REQUIRED JSON SHAPE]",
      '{ "uiPrompts": [{ "prompt": "Ask the agent why...", "promptKind": "knowledge_hint", "transcriptTurnIndex": 0 }], "workerFeedbackMessage": "Ask one concise follow-up question." }',
      "",
      "[CONSTRAINTS]",
      "- Return one valid JSON object matching the required structured schema.",
      "- Return only data matching the required structured schema.",
      "- Every uiPrompts item must use the exact learner-facing string key `prompt`.",
      "- Do not use `text`, `message`, or `content` as aliases for `prompt`.",
      "- Do not include markdown, prose outside fields, or extra keys.",
      "- Do not invent transcriptTurnIndex values.",
      "- Do not correct assistant turns as learner mistakes.",
      "- Do not shame the learner; keep feedback warm and useful.",
    ].join("\n"),
  };
};
