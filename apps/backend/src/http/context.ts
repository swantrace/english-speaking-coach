import type { Context, Hono } from "hono";
import { z } from "zod";
import type { Session } from "../lib/auth";

export type AppVariables = {
  session: Session["session"] | null;
  user: Session["user"] | null;
};

export type AppContext = Context<{ Variables: AppVariables }>;
export type BackendApp = Hono<{ Variables: AppVariables }>;
export type AuthenticatedUser = NonNullable<Session["user"]> & { role?: string };

export function getAuthenticatedUser(context: AppContext) {
  return context.get("user") as AuthenticatedUser | null;
}

export async function parseJsonBody<TSchema extends z.ZodTypeAny>(context: AppContext, schema: TSchema) {
  const rawBody = await context.req.json<unknown>().catch(() => ({}));
  const parsedBody = schema.safeParse(rawBody);

  if (!parsedBody.success) {
    return {
      response: context.json(
        {
          error: "Invalid request body",
          issues: z.treeifyError(parsedBody.error),
        },
        400,
      ),
      success: false as const,
    };
  }

  return {
    data: parsedBody.data,
    success: true as const,
  };
}
