import {
  lingAnalysisJobName,
  scenarioSchema,
  sessionAgentBootstrapSchema,
  sessionCompletionRequestSchema,
  transcriptAnnotationUpsertRequestSchema,
} from "@english-coach/contract";
import { db } from "@english-coach/database";
import { freeFormContexts, scenarios, sessionHistory, sessionTranscripts } from "@english-coach/database/schema";
import { eq } from "drizzle-orm";
import type { BackendApp } from "../http/context";
import { persistTranscriptAnnotationsForSession } from "../lib/queues/in-conversation.analysis";
import { completeSession } from "../lib/queues/session.completion";

const defaultDevelopmentApiToken = "english-coach-local-api-token";

function getExpectedApiToken(env: NodeJS.ProcessEnv = process.env) {
  const configuredToken = env.API_TOKEN?.trim();

  if (configuredToken) {
    return configuredToken;
  }

  if (env.NODE_ENV?.trim().toLowerCase() !== "production") {
    return defaultDevelopmentApiToken;
  }

  return undefined;
}

function requireApiToken(request: Request) {
  const expectedToken = getExpectedApiToken();

  if (!expectedToken) {
    return new Response(JSON.stringify({ error: "API_TOKEN is not configured" }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }

  const authorizationHeader = request.headers.get("authorization");

  if (authorizationHeader !== `Bearer ${expectedToken}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { "Content-Type": "application/json" },
      status: 401,
    });
  }

  return null;
}

export function registerInternalAgentRoutes(app: BackendApp) {
  app.get("/api/internal/agent/sessions/:sessionHistoryId", async (context) => {
    const authError = requireApiToken(context.req.raw);

    if (authError) {
      return authError;
    }

    const sessionHistoryId = context.req.param("sessionHistoryId");

    const [sessionRecord] = await db
      .select()
      .from(sessionHistory)
      .where(eq(sessionHistory.id, sessionHistoryId))
      .limit(1);

    if (!sessionRecord) {
      return context.json({ error: "Session not found" }, 404);
    }

    if (sessionRecord.sessionType === "role-play") {
      if (!sessionRecord.scenarioId || sessionRecord.selectedCharacterIndex === null) {
        return context.json({ error: "Role-play session is incomplete" }, 500);
      }

      const [scenarioRecord] = await db
        .select()
        .from(scenarios)
        .where(eq(scenarios.id, sessionRecord.scenarioId))
        .limit(1);

      if (!scenarioRecord) {
        return context.json({ error: "Scenario not found" }, 404);
      }

      return context.json(
        sessionAgentBootstrapSchema.parse({
          roomName: `session-${sessionRecord.id}`,
          scenario: scenarioSchema.parse(scenarioRecord),
          selectedCharacterIndex: sessionRecord.selectedCharacterIndex,
          sessionHistoryId: sessionRecord.id,
          sessionType: sessionRecord.sessionType,
          userId: sessionRecord.userId,
        }),
      );
    }

    if (!sessionRecord.freeFormContextId) {
      return context.json({ error: "Free-form session is incomplete" }, 500);
    }

    const [freeFormContextRecord] = await db
      .select()
      .from(freeFormContexts)
      .where(eq(freeFormContexts.id, sessionRecord.freeFormContextId))
      .limit(1);

    if (!freeFormContextRecord) {
      return context.json({ error: "Free-form context not found" }, 404);
    }

    return context.json(
      sessionAgentBootstrapSchema.parse({
        contextDocument: freeFormContextRecord.content,
        freeFormContextId: freeFormContextRecord.id,
        roomName: `session-${sessionRecord.id}`,
        sessionHistoryId: sessionRecord.id,
        sessionType: sessionRecord.sessionType,
        userId: sessionRecord.userId,
      }),
    );
  });

  app.post("/api/internal/agent/sessions/:sessionHistoryId/transcript-annotations", async (context) => {
    const authError = requireApiToken(context.req.raw);

    if (authError) {
      return authError;
    }

    const sessionHistoryId = context.req.param("sessionHistoryId");
    const payload = transcriptAnnotationUpsertRequestSchema.safeParse(await context.req.json());

    if (!payload.success) {
      return context.json({ error: "Invalid transcript annotations payload" }, 400);
    }

    await persistTranscriptAnnotationsForSession(sessionHistoryId, payload.data.annotations);

    return context.json({ ok: true });
  });
}
