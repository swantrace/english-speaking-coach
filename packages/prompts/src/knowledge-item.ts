export const buildKnowledgeItemGeneratePrompt = () => ({
  system: "You are a helpful assistant for generating knowledge items.",
  prompt: "Generate a knowledge item based on the following input: {input}",
});
