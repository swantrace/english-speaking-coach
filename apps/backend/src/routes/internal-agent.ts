import { lingAnalysisJobName, scenarioSchema, sessionCompletionRequestSchema } from "@english-coach/contract";
import { db } from "@english-coach/database";
import { scenarios, sessionHistory, sessionTranscripts } from "@english-coach/database/schema";
import { eq } from "drizzle-orm";
import type { BackendApp } from "../http/context";
import { lingAnalysisQueue } from "../lib/queues/ling.analysis";

function requireApiToken(request: Request) {
  const expectedToken = process.env.API_TOKEN?.trim();

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
  app.get("/api/internal/agent/scenarios/:id", async (context) => {
    const authError = requireApiToken(context.req.raw);

    if (authError) {
      return authError;
    }

    const [record] = await db
      .select()
      .from(scenarios)
      .where(eq(scenarios.id, context.req.param("id")))
      .limit(1);

    if (!record) {
      return context.json({ error: "Scenario not found" }, 404);
    }

    return context.json(scenarioSchema.parse(record));
  });

  app.post("/api/internal/agent/session-complete", async (context) => {
    const authError = requireApiToken(context.req.raw);

    if (authError) {
      return authError;
    }

    const rawBody = await context.req.json<unknown>().catch(() => ({}));
    const parsedBody = sessionCompletionRequestSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return context.json({ error: "Invalid request body" }, 400);
    }

    const [existingSession] = await db
      .select({ id: sessionHistory.id, completedGoals: sessionHistory.completedGoals })
      .from(sessionHistory)
      .where(eq(sessionHistory.id, parsedBody.data.sessionHistoryId))
      .limit(1);

    if (!existingSession) {
      return context.json({ error: "Session not found" }, 404);
    }

    const now = new Date().toISOString();

    await db.transaction(async (transaction) => {
      await transaction
        .insert(sessionTranscripts)
        .values({
          createdAt: now,
          id: crypto.randomUUID(),
          sessionHistoryId: parsedBody.data.sessionHistoryId,
          turns: parsedBody.data.transcript,
        })
        .onConflictDoUpdate({
          set: {
            turns: parsedBody.data.transcript,
          },
          target: sessionTranscripts.sessionHistoryId,
        });

      await transaction
        .update(sessionHistory)
        .set({
          completedGoals: parsedBody.data.completedGoals ?? existingSession.completedGoals ?? [],
          endedAt: now,
        })
        .where(eq(sessionHistory.id, parsedBody.data.sessionHistoryId));
    });

    await lingAnalysisQueue.add(
      lingAnalysisJobName,
      { sessionHistoryId: parsedBody.data.sessionHistoryId },
      {
        jobId: `${lingAnalysisJobName}:${parsedBody.data.sessionHistoryId}`,
        removeOnComplete: true,
      },
    );

    return context.json({ status: "accepted" }, 202);
  });
}
