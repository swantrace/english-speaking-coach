type PromptModelParams = {
  modelId?: string;
  providerId?: string;
};

export const buildScenarioStoryGeneratePrompt = ({ brief }: PromptModelParams & { brief: string }) => ({
  system: [
    "You are a scenario designer for an English speaking practice app.",
    "You create realistic two-person role-play scenarios for live voice practice.",
    "Keep scenarios concrete, culturally plausible, and usable for either character as the learner.",
  ].join("\n"),
  prompt: [
    "[TASK]",
    "Expand the brief into a concrete two-person spoken English scenario.",
    "",
    "[GUIDELINES]",
    "- The brief can describe any kind of interaction. Do not assume customer service, complaints, or business context unless the brief implies it.",
    "- Return a concise title, a compact setting summary, exactly two characters, and a detailed story.",
    "- The two characters are the two roles in the scenario. Do not assign one in advance as the learner or the agent.",
    "- The title should work as the main scenario card headline and as a quick label in lists and history.",
    "- The setting should work as a browser card subtitle and as prompt input for the agent.",
    "- The story must explain the background, what each person wants, the main obstacle or misunderstanding, any pressure or constraints, the information that must be clarified, and a plausible path toward resolution.",
    "",
    "[INPUT]",
    "Role-play brief:",
    brief,
  ].join("\n\n"),
});

export const buildScenarioGoalsGeneratePrompt = ({ story }: PromptModelParams & { story: unknown }) => ({
  system: [
    "You are a conversation task designer for an English speaking practice app.",
    "You convert scenario stories into structured goals that can be tracked during live role-play.",
    "Keep goals minimal, observable, and grounded in the scenario.",
  ].join("\n"),
  prompt: [
    "[TASK]",
    "Convert the two-person scenario story into structured role-play goals.",
    "",
    "[GUIDELINES]",
    "- Use only details supported by the scenario story package.",
    "- Top-level intents should be reusable conversational actions, not full sentences.",
    "- Top-level slots should be concrete pieces of information that matter for resolving the interaction.",
    "- Goals should describe what the learner must accomplish.",
    "- Order goals by the most natural flow of the conversation.",
    "- Keep the goal set minimal while still covering the full interaction.",
    "- Every required_intents and required_slots entry must reference names declared in the top-level intents and slots arrays.",
    "- Every goal logic object must include both required_intents and required_slots arrays. Use an empty required_slots array when the goal does not need slot values.",
    "- Do not include runtime progress or status.",
    "",
    "[INPUT]",
    "Scenario story package:",
    JSON.stringify(story, null, 2),
  ].join("\n\n"),
});

export const buildScenarioExampleDialoguePrompt = ({
  goals,
  story,
}: PromptModelParams & { goals: unknown; story: unknown }) => ({
  system: [
    "You are a dialogue writer for an English speaking practice app.",
    "You write concise, natural two-person example dialogues that demonstrate role-play success.",
    "Make the language spoken, realistic, and easy to follow.",
  ].join("\n"),
  prompt: [
    "[TASK]",
    "Write a short example dialogue for the two-person spoken English role-play.",
    "",
    "[GUIDELINES]",
    "- Use characterIndex 0 or 1 on each turn so every line is tied to one generated character.",
    "- characterIndex 0 refers to characters[0]. characterIndex 1 refers to characters[1].",
    "- The dialogue should sound natural, reflect the characters and conflict, and show a credible path through the interaction.",
    "- Keep the dialogue concise but complete enough to demonstrate how the scenario can succeed.",
    "- The dialogue must visibly cover the key goals, intents, and slot collection implied by the goals object.",
    "",
    "[INPUT]",
    "Scenario story package:",
    JSON.stringify(story, null, 2),
    "Goals object:",
    JSON.stringify(goals, null, 2),
  ].join("\n\n"),
});
