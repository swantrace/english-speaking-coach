import type { MiddlewareHandler } from "hono";
import { auth } from "../lib/auth";
import type { AppContext, AppVariables, BackendApp } from "./context";
import { getAuthenticatedUser } from "./context";

async function getRequestSession(request: Request) {
  return auth.api.getSession({
    headers: request.headers,
  });
}

export function requireAuth(context: AppContext) {
  if (!context.get("session") || !context.get("user")) {
    return context.json(
      {
        error: "Authentication required",
      },
      401,
    );
  }

  return null;
}

export function requireAdmin(context: AppContext) {
  const authError = requireAuth(context);
  if (authError) return authError;

  if (getAuthenticatedUser(context)?.role !== "admin") {
    return context.json({ error: "Forbidden" }, 403);
  }

  return null;
}

export const attachRequestSession: MiddlewareHandler<{ Variables: AppVariables }> = async (context, next) => {
  const session = await getRequestSession(context.req.raw);

  if (!session) {
    context.set("session", null);
    context.set("user", null);
    await next();
    return;
  }

  context.set("session", session.session);
  context.set("user", session.user);
  await next();
};

export const requireAuthMiddleware: MiddlewareHandler<{ Variables: AppVariables }> = async (context, next) => {
  const response = requireAuth(context);

  if (response) {
    return response;
  }

  await next();
};

export const requireAdminMiddleware: MiddlewareHandler<{ Variables: AppVariables }> = async (context, next) => {
  const response = requireAdmin(context);

  if (response) {
    return response;
  }

  await next();
};

export function registerAccessPolicies(app: BackendApp) {
  for (const path of [
    "/api/learner/scenarios",
    "/api/learner/scenarios/*",
    "/api/scenarios",
    "/api/scenarios/*",
    "/api/history",
    "/api/history/*",
    "/api/sessions/*",
  ]) {
    app.use(path, requireAuthMiddleware);
  }

  for (const path of ["/api/scenarios/generate", "/api/scenarios/generate/*", "/api/admin/*"]) {
    app.use(path, requireAdminMiddleware);
  }
}
