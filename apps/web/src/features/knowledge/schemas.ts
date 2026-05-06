import { communicativeFunctionValues, fixednessLevelValues, patternTypeValues } from "@english-coach/domain";
import type { FieldError, FieldErrors, Resolver } from "react-hook-form";
import { z } from "zod";
import type { BulkKnowledgeFormValues, KnowledgeFormValues } from "./types";

const requiredTrimmedString = z.string().trim().min(1, "This field is required.");
const patternSchema = z
  .string()
  .trim()
  .min(2, "Add a fuller knowledge pattern.")
  .max(200, "Keep the pattern concise enough to review quickly.");
const optionalTrimmedString = z.string().trim().optional().default("");
const optionalEnumSchema = <TValues extends readonly [string, ...string[]]>(values: TValues) =>
  z.union([z.enum(values), z.literal("")]).default("");

export const knowledgeSenseFormSchema = z.object({
  example: requiredTrimmedString,
  exampleZh: requiredTrimmedString,
  grammaticalNote: optionalTrimmedString,
  meaningEn: requiredTrimmedString,
  meaningZh: requiredTrimmedString,
  order: z.number().int().min(1),
});

export const knowledgeFormSchema = z
  .object({
    communicativeFunction: optionalEnumSchema(communicativeFunctionValues),
    fixednessLevel: optionalEnumSchema(fixednessLevelValues),
    isPendingReview: z.boolean().default(false),
    pattern: patternSchema,
    senses: z.array(knowledgeSenseFormSchema).min(1, "Add at least one sense."),
    patternType: optionalEnumSchema(patternTypeValues),
  })
  .superRefine((value, context) => {
    const seenOrders = new Set<number>();

    value.senses.forEach((sense, index) => {
      if (seenOrders.has(sense.order)) {
        context.addIssue({
          code: "custom",
          message: "Each sense order must be unique.",
          path: ["senses", index, "order"],
        });
      }

      seenOrders.add(sense.order);
    });
  });

export const bulkKnowledgeFormSchema = z.object({
  patterns: z.string().refine((value) => value.split(/\r?\n/).some((line) => line.trim().length > 0), {
    message: "Add at least one draft pattern.",
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

export const knowledgeFormResolver = createZodResolver<KnowledgeFormValues>(knowledgeFormSchema);
export const bulkKnowledgeFormResolver = createZodResolver<BulkKnowledgeFormValues>(bulkKnowledgeFormSchema);
