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
    modelId: string,
    payload: GenerateScenarioInput,
    context?: AiRequestLogContext,
  ): Promise<GeneratedScenario> {
    const story = await generateScenarioStory(modelId, payload, context);
    const goals = await generateScenarioGoals(
      modelId,
      {
        story,
      },
      context,
    );
    const exampleDialogue = await generateScenarioExampleDialogue(
      modelId,
      {
        goals,
        story,
      },
      context,
    );

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
