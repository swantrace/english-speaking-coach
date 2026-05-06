import type { FieldError, FieldErrors, Resolver } from "react-hook-form";
import { z } from "zod";
import type { BulkScenarioFormValues, ScenarioFormValues } from "./types";

const trimmedRequiredStringSchema = z.string().trim().min(1, "This field is required.");
const optionalUrlSchema = z.string().trim().url("Enter a valid image URL.").or(z.literal("")).default("");

const scenarioCharacterFormSchema = z.object({
  description: trimmedRequiredStringSchema,
  name: trimmedRequiredStringSchema,
});

const scenarioGoalLogicFormSchema = z.object({
  required_intents: z.array(z.string().trim()).default([]),
  required_slots: z.array(z.string().trim()).default([]),
});

const scenarioGoalFormSchema = z.object({
  description: trimmedRequiredStringSchema,
  id: trimmedRequiredStringSchema,
  logic: scenarioGoalLogicFormSchema,
  optional: z.boolean().default(false),
});

const exampleDialogueTurnFormSchema = z.object({
  characterIndex: z.union([z.literal(0), z.literal(1)]),
  id: trimmedRequiredStringSchema,
  text: trimmedRequiredStringSchema,
});

export const scenarioFormSchema = z
  .object({
    characters: z.tuple([scenarioCharacterFormSchema, scenarioCharacterFormSchema]),
    exampleDialogue: z.array(exampleDialogueTurnFormSchema).min(1, "Add at least one example dialogue turn."),
    goals: z.object({
      goals: z.array(scenarioGoalFormSchema).min(1, "Add at least one goal."),
      intents: z.array(z.string().trim()).default([]),
      slots: z.array(z.string().trim()).default([]),
    }),
    imageUrl: optionalUrlSchema,
    isPendingReview: z.boolean().default(false),
    setting: z.string().trim().min(12, "Add a more specific setting description."),
    tags: z.array(z.string().trim()).max(12, "Keep the tag list concise.").default([]),
    title: z.string().trim().min(3, "Add a scenario title."),
  })
  .superRefine((value, context) => {
    const availableIntents = new Set(value.goals.intents);
    const availableSlots = new Set(value.goals.slots);

    value.goals.goals.forEach((goal, index) => {
      goal.logic.required_intents.forEach((intent) => {
        if (!availableIntents.has(intent)) {
          context.addIssue({
            code: "custom",
            message: "Each required intent must come from the top-level intents list.",
            path: ["goals", "goals", index, "logic", "required_intents"],
          });
        }
      });

      goal.logic.required_slots.forEach((slot) => {
        if (!availableSlots.has(slot)) {
          context.addIssue({
            code: "custom",
            message: "Each required slot must come from the top-level slots list.",
            path: ["goals", "goals", index, "logic", "required_slots"],
          });
        }
      });
    });
  });

export const bulkScenarioFormSchema = z.object({
  drafts: z.string().refine((value) => value.split(/\r?\n/).some((line) => line.trim().length > 0), {
    message: "Add at least one draft setting description.",
  }),
});

function setNestedError(target: Record<string | number, unknown>, path: (string | number)[], message: string) {
  const [segment, ...rest] = path;

  if (segment === undefined) {
    return;
  }

  if (rest.length === 0) {
    target[segment] = {
      message,
      type: "zod",
    } satisfies FieldError;
    return;
  }

  const nextValue = target[segment];

  if (typeof nextValue !== "object" || nextValue === null) {
    target[segment] = typeof rest[0] === "number" ? [] : {};
  }

  setNestedError(target[segment] as Record<string | number, unknown>, rest, message);
}

function createZodResolver<TValues extends object>(schema: z.ZodType<TValues>): Resolver<TValues> {
  return async (values) => {
    const result = schema.safeParse(values);

    if (result.success) {
      return {
        errors: {},
        values: result.data,
      };
    }

    const errors: Record<string | number, unknown> = {};

    for (const issue of result.error.issues) {
      const path = issue.path.filter(
        (segment): segment is string | number => typeof segment === "string" || typeof segment === "number",
      );

      if (path.length === 0) {
        continue;
      }

      setNestedError(errors, path, issue.message);
    }

    return {
      errors: errors as FieldErrors<TValues>,
      values: {},
    };
  };
}

export const scenarioFormResolver = createZodResolver<ScenarioFormValues>(scenarioFormSchema);
export const bulkScenarioFormResolver = createZodResolver<BulkScenarioFormValues>(bulkScenarioFormSchema);
