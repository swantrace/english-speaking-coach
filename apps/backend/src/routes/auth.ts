import type { BackendApp } from "../http/context";
import { auth } from "../lib/auth";

export function registerAuthRoutes(app: BackendApp) {
  app.on(["GET", "POST"], "/api/auth/*", (context) => {
    return auth.handler(context.req.raw);
  });
}
