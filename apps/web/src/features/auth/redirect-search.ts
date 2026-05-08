import { z } from "zod";

const optionalRedirectToSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

export const authRedirectSearchSchema = z.object({
  redirectTo: optionalRedirectToSchema,
});

export type AuthRedirectSearchParams = z.infer<typeof authRedirectSearchSchema>;

export function parseAuthRedirectSearch(search: Record<string, unknown>) {
  return authRedirectSearchSchema.parse(search);
}
