import {
  type ScenarioGoals,
  scenarioCharacterSchema,
  scenarioDialogueTurnSchema,
  scenarioGoalsSchema,
} from "@english-coach/contract/scenario";
import {
  buildScenarioExampleDialoguePrompt,
  buildScenarioGoalsGeneratePrompt,
  buildScenarioStoryGeneratePrompt,
} from "@english-coach/prompts";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { ScenarioGenerationModelRoutes } from "../model-config";
import { providerOptionsForStructuredOutput } from "../provider-options";
import { languageModel, type ProviderId } from "../registry";
import { type AiRequestLogContext, recordAiModelRequest } from "../request-logging";

const generatedScenarioSchema = z.object({
  characters: scenarioCharacterSchema.array().length(2),
  exampleDialogue: z.array(scenarioDialogueTurnSchema).min(1),
  goals: scenarioGoalsSchema,
  setting: z.string().trim().min(1),
  title: z.string().trim().min(1),
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
  context,
  operation,
  promptParts,
  modelId,
  providerId,
  schema,
}: {
  context?: AiRequestLogContext;
  modelId: string;
  operation: string;
  promptParts: { prompt: string; system: string };
  providerId: ProviderId;
  schema: TSchema;
}): Promise<z.output<TSchema>> {
  const { output } = await recordAiModelRequest({
    context,
    input: promptParts,
    modelId,
    operation,
    providerId,
    run: () =>
      generateText({
        providerOptions: providerOptionsForStructuredOutput({ modelId, providerId }),
        model: languageModel(providerId, modelId),
        output: Output.object({
          schema,
        }),
        system: promptParts.system,
        prompt: promptParts.prompt,
      }),
  });

  return schema.parse(output);
}

export function createScenarioHandlers(providerId: ProviderId) {
  async function generateScenarioStory(
    modelId: string,
    payload: GenerateScenarioStoryInput,
    context?: AiRequestLogContext,
  ): Promise<ScenarioStory> {
    const promptParts = buildScenarioStoryGeneratePrompt({ modelId, providerId, ...payload });

    return generateScenarioObject({
      context: {
        ...context,
        metadata: {
          ...context?.metadata,
          payload,
        },
      },
      modelId,
      operation: "scenario.generate.story",
      promptParts,
      providerId,
      schema: scenarioStorySchema,
    });
  }

  async function generateScenarioGoals(
    modelId: string,
    payload: GenerateScenarioGoalsInput,
    context?: AiRequestLogContext,
  ): Promise<ScenarioGoals> {
    const promptParts = buildScenarioGoalsGeneratePrompt({ modelId, providerId, ...payload });

    return generateScenarioObject({
      context: {
        ...context,
        metadata: {
          ...context?.metadata,
          payload,
        },
      },
      modelId,
      operation: "scenario.generate.goals",
      promptParts,
      providerId,
      schema: scenarioGoalsSchema,
    });
  }

  async function generateScenarioExampleDialogue(
    modelId: string,
    payload: GenerateScenarioExampleDialogueInput,
    context?: AiRequestLogContext,
  ) {
    const promptParts = buildScenarioExampleDialoguePrompt({ modelId, providerId, ...payload });
    const result = await generateScenarioObject({
      context: {
        ...context,
        metadata: {
          ...context?.metadata,
          payload,
        },
      },
      modelId,
      operation: "scenario.generate.example_dialogue",
      promptParts,
      providerId,
      schema: scenarioDialogueExampleSchema,
    });

    return result.exampleDialogue;
  }

  async function generateScenario(
    modelOrRoutes: string | ScenarioGenerationModelRoutes,
    payload: GenerateScenarioInput,
    context?: AiRequestLogContext,
  ): Promise<GeneratedScenario> {
    const routes =
      typeof modelOrRoutes === "string"
        ? {
            dialogue: { modelId: modelOrRoutes, providerId },
            goals: { modelId: modelOrRoutes, providerId },
            story: { modelId: modelOrRoutes, providerId },
          }
        : modelOrRoutes;

    const storyPromptParts = buildScenarioStoryGeneratePrompt({
      modelId: routes.story.modelId,
      providerId: routes.story.providerId,
      ...payload,
    });
    const story = await generateScenarioObject({
      context: {
        ...context,
        metadata: {
          ...context?.metadata,
          payload,
          scenarioStep: "story",
        },
      },
      modelId: routes.story.modelId,
      operation: "scenario.generate.story",
      promptParts: storyPromptParts,
      providerId: routes.story.providerId,
      schema: scenarioStorySchema,
    });

    const goalsPromptParts = buildScenarioGoalsGeneratePrompt({
      modelId: routes.goals.modelId,
      providerId: routes.goals.providerId,
      story,
    });
    const goals = await generateScenarioObject({
      context: {
        ...context,
        metadata: {
          ...context?.metadata,
          scenarioStep: "goals",
        },
      },
      modelId: routes.goals.modelId,
      operation: "scenario.generate.goals",
      promptParts: goalsPromptParts,
      providerId: routes.goals.providerId,
      schema: scenarioGoalsSchema,
    });

    const dialoguePromptParts = buildScenarioExampleDialoguePrompt({
      goals,
      modelId: routes.dialogue.modelId,
      providerId: routes.dialogue.providerId,
      story,
    });
    const dialogueResult = await generateScenarioObject({
      context: {
        ...context,
        metadata: {
          ...context?.metadata,
          scenarioStep: "dialogue",
        },
      },
      modelId: routes.dialogue.modelId,
      operation: "scenario.generate.example_dialogue",
      promptParts: dialoguePromptParts,
      providerId: routes.dialogue.providerId,
      schema: scenarioDialogueExampleSchema,
    });
    const exampleDialogue = dialogueResult.exampleDialogue;

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
