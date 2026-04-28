export const buildScenarioStoryGeneratePrompt = () => ({
  system: "You are a helpful assistant for generating scenario stories.",
  prompt: "Generate a scenario story based on the following input: {input}",
});

export const buildScenarioGoalsGeneratePrompt = () => ({
  system: "You are a helpful assistant for generating scenario goals.",
  prompt: "Generate scenario goals based on the following input: {input}",
});

export const buildScenarioExampleDialoguePrompt = () => ({
  system: "You are a helpful assistant for generating scenarios from dialogues.",
  prompt: "Generate a scenario from the following dialogue: {input}",
});
