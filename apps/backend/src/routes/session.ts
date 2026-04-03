import { sessionTypeSchema } from "@english-coach/contract";
import { db } from "@english-coach/database";
import { freeFormContexts, scenarios, sessionHistory } from "@english-coach/database/schema";
import { eq } from "drizzle-orm";
import { AccessToken, RoomAgentDispatch, RoomConfiguration } from "livekit-server-sdk";
import { z } from "zod";
import type { BackendApp } from "../http/context";
import { getAuthenticatedUser, parseJsonBody } from "../http/context";

const rolePlaySessionTokenRequestSchema = z.object({
  scenarioId: z.string().min(1),
  selectedCharacterIndex: z.number().int().min(0).max(1),
  sessionType: z.literal(sessionTypeSchema.enum["role-play"]),
});
const freeFormSessionTokenRequestSchema = z.object({
  contextDocument: z.string().trim().min(1),
  sessionType: z.literal(sessionTypeSchema.enum["free-form"]),
});
const sessionTokenRequestSchema = z.discriminatedUnion("sessionType", [
  rolePlaySessionTokenRequestSchema,
  freeFormSessionTokenRequestSchema,
]);

export function registerSessionRoutes(app: BackendApp) {
  app.get("/api/session", (context) => {
    return context.json({
      session: context.get("session"),
      user: context.get("user"),
    });
  });

  app.post("/api/sessions/token", async (context) => {
    const parsedBody = await parseJsonBody(context, sessionTokenRequestSchema);

    if (!parsedBody.success) {
      return parsedBody.response;
    }

    const currentUser = getAuthenticatedUser(context);

    if (!currentUser) {
      return context.json({ error: "Authentication required" }, 401);
    }

    const sessionHistoryId = crypto.randomUUID();
    const roomName = `session-${sessionHistoryId}`;
    const startedAt = new Date().toISOString();
    let metadata: Record<string, unknown>;

    if (parsedBody.data.sessionType === "role-play") {
      const [scenarioRecord] = await db
        .select({ id: scenarios.id })
        .from(scenarios)
        .where(eq(scenarios.id, parsedBody.data.scenarioId))
        .limit(1);

      if (!scenarioRecord) {
        return context.json({ error: "Scenario not found" }, 404);
      }

      await db.insert(sessionHistory).values({
        completedGoals: [],
        freeFormContextId: null,
        id: sessionHistoryId,
        scenarioId: parsedBody.data.scenarioId,
        selectedCharacterIndex: parsedBody.data.selectedCharacterIndex,
        sessionType: parsedBody.data.sessionType,
        startedAt,
        userId: currentUser.id,
      });

      metadata = {
        roomName,
        scenarioId: parsedBody.data.scenarioId,
        selectedCharacterIndex: parsedBody.data.selectedCharacterIndex,
        sessionHistoryId,
        sessionType: parsedBody.data.sessionType,
        userId: currentUser.id,
      };
    } else {
      const freeFormContextId = crypto.randomUUID();

      await db.insert(freeFormContexts).values({
        content: parsedBody.data.contextDocument,
        createdAt: startedAt,
        id: freeFormContextId,
      });

      await db.insert(sessionHistory).values({
        freeFormContextId,
        id: sessionHistoryId,
        sessionType: parsedBody.data.sessionType,
        startedAt,
        userId: currentUser.id,
      });

      metadata = {
        contextDocument: parsedBody.data.contextDocument,
        freeFormContextId,
        roomName,
        sessionHistoryId,
        sessionType: parsedBody.data.sessionType,
        userId: currentUser.id,
      };
    }

    try {
      const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
        identity: `${currentUser.id}:${sessionHistoryId}`,
        metadata: JSON.stringify({ sessionHistoryId, userId: currentUser.id }),
        name: currentUser.name,
        ttl: process.env.LIVEKIT_TOKEN_TTL ?? "6h",
      });

      token.addGrant({
        canPublish: true,
        canPublishData: true,
        canSubscribe: true,
        room: roomName,
        roomJoin: true,
      });

      const roomConfig = new RoomConfiguration({
        name: roomName,
      });

      roomConfig.agents = [
        new RoomAgentDispatch({
          agentName: "english-speaking-coach-agent",
          metadata: JSON.stringify(metadata),
        }),
      ];

      token.roomConfig = roomConfig;

      return context.json({
        roomName,
        token: await token.toJwt(),
      });
    } catch (error) {
      return context.json(
        {
          error: error instanceof Error ? error.message : "Failed to mint LiveKit session token",
        },
        500,
      );
    }
  });
}
