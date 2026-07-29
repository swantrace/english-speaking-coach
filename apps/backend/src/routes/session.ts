import {
  createSessionRequestSchema,
  createSessionResultSchema,
  endSessionResultSchema,
  liveSessionBootstrapSchema,
  sessionDispatchMetadataSchema,
} from "@english-coach/contract/session";
import { db } from "@english-coach/database";
import { freeFormContexts, scenarios, sessionHistory } from "@english-coach/database/schema";
import { eq } from "drizzle-orm";
import { AccessToken, RoomAgentDispatch, RoomConfiguration } from "livekit-server-sdk";
import type { BackendApp } from "../http/context";
import { getAuthenticatedUser, parseJsonBody } from "../http/context";
import { getLiveKitAgentName } from "../lib/livekit-agent-name";

function createSessionToken(params: {
  roomName: string;
  sessionHistoryId: string;
  userId: string;
  userName: string | null;
}) {
  const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: `${params.userId}:${params.sessionHistoryId}`,
    metadata: JSON.stringify({ sessionHistoryId: params.sessionHistoryId, userId: params.userId }),
    name: params.userName ?? params.userId,
    ttl: process.env.LIVEKIT_TOKEN_TTL ?? "6h",
  });

  token.addGrant({
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
    room: params.roomName,
    roomJoin: true,
  });

  const roomConfig = new RoomConfiguration({
    name: params.roomName,
  });

  roomConfig.agents = [
    new RoomAgentDispatch({
      agentName: getLiveKitAgentName(),
      metadata: JSON.stringify(sessionDispatchMetadataSchema.parse({ sessionHistoryId: params.sessionHistoryId })),
    }),
  ];

  token.roomConfig = roomConfig;

  return token;
}

export function registerSessionRoutes(app: BackendApp) {
  // Create a session history record and mint a LiveKit token for a new session.
  app.post("/api/sessions/token", async (context) => {
    const parsedBody = await parseJsonBody(context, createSessionRequestSchema);

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
    } else {
      const freeFormContextId = crypto.randomUUID();

      await db.insert(freeFormContexts).values({
        content: parsedBody.data.contextDocument,
        summary: parsedBody.data.summary,
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
    }

    try {
      const token = createSessionToken({
        roomName,
        sessionHistoryId,
        userId: currentUser.id,
        userName: currentUser.name,
      });

      return context.json(
        createSessionResultSchema.parse({
          roomName,
          sessionId: sessionHistoryId,
          sessionType: parsedBody.data.sessionType,
          token: await token.toJwt(),
        }),
      );
    } catch (error) {
      return context.json(
        {
          error: error instanceof Error ? error.message : "Failed to mint LiveKit session token",
        },
        500,
      );
    }
  });

  // Reopen a live session by returning its LiveKit room and session bootstrap data.
  app.get("/api/sessions/:sessionId/live", async (context) => {
    const currentUser = getAuthenticatedUser(context);

    if (!currentUser) {
      return context.json({ error: "Authentication required" }, 401);
    }

    const sessionId = context.req.param("sessionId");
    const [sessionRecord] = await db.select().from(sessionHistory).where(eq(sessionHistory.id, sessionId)).limit(1);

    if (!sessionRecord || sessionRecord.userId !== currentUser.id) {
      return context.json({ error: "Session not found" }, 404);
    }

    try {
      const token = createSessionToken({
        roomName: `session-${sessionRecord.id}`,
        sessionHistoryId: sessionRecord.id,
        userId: currentUser.id,
        userName: currentUser.name,
      });

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
          liveSessionBootstrapSchema.parse({
            endedAt: sessionRecord.endedAt,
            room: {
              roomName: `session-${sessionRecord.id}`,
              serverUrl: process.env.LIVEKIT_URL,
              token: await token.toJwt(),
            },
            scenario: {
              characters: scenarioRecord.characters,
              goals: scenarioRecord.goals.goals.map((goal) => ({
                description: goal.description,
                id: goal.id,
                optional: goal.optional ?? false,
              })),
              id: scenarioRecord.id,
              imageUrl: scenarioRecord.imageUrl,
              selectedCharacterIndex: sessionRecord.selectedCharacterIndex,
              setting: scenarioRecord.setting,
              title: scenarioRecord.title,
            },
            sessionId: sessionRecord.id,
            sessionType: sessionRecord.sessionType,
            startedAt: sessionRecord.startedAt,
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
        liveSessionBootstrapSchema.parse({
          context: {
            content: freeFormContextRecord.content,
            summary: freeFormContextRecord.summary,
          },
          endedAt: sessionRecord.endedAt,
          room: {
            roomName: `session-${sessionRecord.id}`,
            serverUrl: process.env.LIVEKIT_URL,
            token: await token.toJwt(),
          },
          sessionId: sessionRecord.id,
          sessionType: sessionRecord.sessionType,
          startedAt: sessionRecord.startedAt,
        }),
      );
    } catch (error) {
      return context.json(
        {
          error: error instanceof Error ? error.message : "Failed to prepare live session bootstrap",
        },
        500,
      );
    }
  });

  // Mark a session ended when the client closes or leaves the live room.
  app.post("/api/sessions/:sessionId/end", async (context) => {
    const currentUser = getAuthenticatedUser(context);

    if (!currentUser) {
      return context.json({ error: "Authentication required" }, 401);
    }

    const sessionId = context.req.param("sessionId");
    const [sessionRecord] = await db
      .select({
        endedAt: sessionHistory.endedAt,
        id: sessionHistory.id,
        userId: sessionHistory.userId,
      })
      .from(sessionHistory)
      .where(eq(sessionHistory.id, sessionId))
      .limit(1);

    if (!sessionRecord || sessionRecord.userId !== currentUser.id) {
      return context.json({ error: "Session not found" }, 404);
    }

    const endedAt = sessionRecord.endedAt ?? new Date().toISOString();

    if (!sessionRecord.endedAt) {
      await db.update(sessionHistory).set({ endedAt }).where(eq(sessionHistory.id, sessionRecord.id));
    }

    return context.json(
      endSessionResultSchema.parse({
        endedAt,
        sessionId: sessionRecord.id,
      }),
    );
  });
}
