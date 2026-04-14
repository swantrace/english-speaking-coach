import type { FieldError, FieldErrors, Resolver } from "react-hook-form";
import { z } from "zod";
import { stripRichTextToPlainText } from "./mappers";
import type { FreeFormSessionFormValues } from "./types";

export const freeFormSessionFormSchema = z.object({
  content: z.string().superRefine((value, context) => {
    if (stripRichTextToPlainText(value).length === 0) {
      context.addIssue({
        code: "custom",
        message: "Add some context before starting the session.",
      });
    }
  }),
});

export const freeFormSessionFormResolver: Resolver<FreeFormSessionFormValues> = async (values) => {
  const result = freeFormSessionFormSchema.safeParse(values);

  if (result.success) {
    return {
      errors: {},
      values: result.data,
    };
  }

  const errors: Partial<Record<keyof FreeFormSessionFormValues, FieldError>> = {};

  for (const issue of result.error.issues) {
    const fieldName = issue.path[0];

    if (fieldName !== "content" || errors.content) {
      continue;
    }

    errors.content = {
      message: issue.message,
      type: "zod",
    };
  }

  return {
    errors: errors as FieldErrors<FreeFormSessionFormValues>,
    values: {},
  };
};
