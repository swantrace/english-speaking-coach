import {
  type ScenarioGoals,
  scenarioCharacterSchema,
  scenarioDialogueTurnSchema,
  scenarioGoalsSchema,
  scenarioSchema,
} from "@english-coach/contract/scenario";
import {
  buildScenarioExampleDialoguePrompt,
  buildScenarioGoalsGeneratePrompt,
  buildScenarioStoryGeneratePrompt,
} from "@english-coach/prompts";
import { generateText, Output } from "ai";
import { z } from "zod";
import { providerOptionsForStructuredOutput } from "../provider-options";
import { languageModel, type ProviderId } from "../registry";

const generatedScenarioSchema = scenarioSchema
  .omit({
    createdAt: true,
    id: true,
    isPendingReview: true,
    updatedAt: true,
  })
  .extend({
    characters: scenarioCharacterSchema.array().length(2),
  });

const scenarioStorySchema = z.object({
  characters: scenarioCharacterSchema.array().length(2),
  setting: z.string().trim().min(1),
  story: z.string().trim().min(1),
  title: z.string().trim().min(1),
});

const scenarioDialogueExampleSchema = z.object({
  exampleDialogue: z.array(scenarioDialogueTurnSchema).min(1),
});

export type GeneratedScenario = z.output<typeof generatedScenarioSchema>;
export type ScenarioStory = z.infer<typeof scenarioStorySchema>;

export type GenerateScenarioStoryInput = {
  brief: string;
};

export type GenerateScenarioGoalsInput = {
  story: ScenarioStory;
};

export type GenerateScenarioExampleDialogueInput = {
  goals: ScenarioGoals;
  story: ScenarioStory;
};

export type GenerateScenarioInput = GenerateScenarioStoryInput;

async function generateScenarioObject<TSchema extends z.ZodTypeAny>({
  promptParts,
  modelId,
  providerId,
  schema,
}: {
  modelId: string;
  promptParts: { prompt: string; system: string };
  providerId: ProviderId;
  schema: TSchema;
}): Promise<z.output<TSchema>> {
  const { output } = await generateText({
    providerOptions: providerOptionsForStructuredOutput({ modelId, providerId }),
    model: languageModel(providerId, modelId),
    output: Output.object({
      schema,
    }),
    system: promptParts.system,
    prompt: promptParts.prompt,
  });

  return schema.parse(output);
}

export function createScenarioHandlers(providerId: ProviderId) {
  async function generateScenarioStory(modelId: string, payload: GenerateScenarioStoryInput): Promise<ScenarioStory> {
    const promptParts = buildScenarioStoryGeneratePrompt({ modelId, providerId, ...payload });

    return generateScenarioObject({
      modelId,
      promptParts,
      providerId,
      schema: scenarioStorySchema,
    });
  }

  async function generateScenarioGoals(modelId: string, payload: GenerateScenarioGoalsInput): Promise<ScenarioGoals> {
    const promptParts = buildScenarioGoalsGeneratePrompt({ modelId, providerId, ...payload });

    return generateScenarioObject({
      modelId,
      promptParts,
      providerId,
      schema: scenarioGoalsSchema,
    });
  }

  async function generateScenarioExampleDialogue(modelId: string, payload: GenerateScenarioExampleDialogueInput) {
    const promptParts = buildScenarioExampleDialoguePrompt({ modelId, providerId, ...payload });
    const result = await generateScenarioObject({
      modelId,
      promptParts,
      providerId,
      schema: scenarioDialogueExampleSchema,
    });

    return result.exampleDialogue;
  }

  async function generateScenario(modelId: string, payload: GenerateScenarioInput): Promise<GeneratedScenario> {
    const story = await generateScenarioStory(modelId, payload);
    const goals = await generateScenarioGoals(modelId, {
      story,
    });
    const exampleDialogue = await generateScenarioExampleDialogue(modelId, {
      goals,
      story,
    });

    return generatedScenarioSchema.parse({
      characters: story.characters,
      exampleDialogue,
      goals,
      setting: story.setting,
      title: story.title,
    });
  }

  return {
    generateScenario,
    generateScenarioExampleDialogue,
    generateScenarioGoals,
    generateScenarioStory,
  };
}
