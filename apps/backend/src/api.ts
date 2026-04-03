import {
  createScenarioGenerateEventsUrl,
  type ScenarioGenerateSubmissionResponse,
  type ScenarioGenerateSubmissionResult,
  scenarioGenerateDefaultEventsLimit,
  scenarioGenerateEventsPath,
  scenarioGenerateEventsQuerySchema,
  scenarioGenerateEventsSubscriberPrefix,
  scenarioGenerateSubmissionItemSchema,
  scenarioGenerateSubmissionResponseSchema,
  scenarioGenerateSubmissionTransportRequestSchema,
  scenarioGenerateSubmitPath,
} from "@english-coach/contract/scenario-generate";
import { databasePath, migrateDatabase } from "@english-coach/database";
import { type Context, Hono } from "hono";
import { cors } from "hono/cors";
import { auth, type Session } from "./lib/auth";
import { authTrustedOrigins } from "./lib/auth/options";
import {
  createScenarioGenerateSubmission,
  getScenarioGenerateSnapshots,
  persistQueuedScenarioGenerateJob,
  type ScenarioGenerateJobData,
  scenarioGenerateJobName,
  scenarioGenerateProgressChannel,
  scenarioGenerateQueue,
  scenarioGenerateQueueName,
  scenarioGenerateUpdatedEvent,
  scenarioGenerateWorker,
} from "./lib/queues/scenario.generate";
import { streamChannelJobProgressSSE } from "./lib/sse/job-events";

function normalizeGenerateRequestItems(body: unknown): unknown[] {
  const parsedBody = scenarioGenerateSubmissionTransportRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return [];
  }

  if (
    typeof parsedBody.data === "object" &&
    parsedBody.data !== null &&
    "items" in parsedBody.data &&
    Array.isArray(parsedBody.data.items)
  ) {
    return parsedBody.data.items;
  }

  return [parsedBody.data];
}

function toScenarioGeneratePayload(
  item: unknown,
  submissionId: string,
  cursor: number,
): ScenarioGenerateJobData | null {
  const parsedItem = scenarioGenerateSubmissionItemSchema.safeParse(item);

  if (!parsedItem.success) {
    return null;
  }

  return {
    cursor,
    ...parsedItem.data,
    queuedAt: parsedItem.data.queuedAt ?? new Date().toISOString(),
    submissionId,
  };
}

type AppVariables = {
  session: Session["session"] | null;
  user: Session["user"] | null;
};

type AppContext = Context<{ Variables: AppVariables }>;

async function getRequestSession(request: Request) {
  return auth.api.getSession({
    headers: request.headers,
  });
}

function requireAuth(context: AppContext) {
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

migrateDatabase();
void scenarioGenerateWorker;

export const app = new Hono<{ Variables: AppVariables }>();
const port = Number(process.env.PORT ?? 3001);

app.use(
  "/api/*",
  cors({
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    origin: authTrustedOrigins,
  }),
);

app.use("*", async (context, next) => {
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
});

app.use("/api/scenarios/*", async (context, next) => {
  const response = requireAuth(context);

  if (response) {
    return response;
  }

  await next();
});

app.use("/api/session", async (context, next) => {
  const response = requireAuth(context);

  if (response) {
    return response;
  }

  await next();
});

app.on(["GET", "POST"], "/api/auth/*", (context) => {
  return auth.handler(context.req.raw);
});

app.get("/health", (context) => {
  return context.json({
    auth: "ok",
    databasePath,
    queue: scenarioGenerateQueueName,
    service: "backend-api",
    status: "ok",
  });
});

app.get("/api/session", (context) => {
  return context.json({
    session: context.get("session"),
    user: context.get("user"),
  });
});

app.post(scenarioGenerateSubmitPath, async (context) => {
  const rawBody = await context.req.json<unknown>().catch(() => ({}));
  const items = normalizeGenerateRequestItems(rawBody);
  const submissionId = crypto.randomUUID();

  await createScenarioGenerateSubmission(submissionId, items.length === 0 ? 1 : items.length);

  if (items.length === 0) {
    const invalidResponse = scenarioGenerateSubmissionResponseSchema.parse({
      eventsUrl: createScenarioGenerateEventsUrl({
        limit: scenarioGenerateDefaultEventsLimit,
        submissionId,
      }),
      limit: scenarioGenerateDefaultEventsLimit,
      results: [
        {
          error: "Request body must be a valid scenario item or an object with a non-empty items array",
          index: 0,
          status: "invalid_input",
          submissionId,
        } satisfies ScenarioGenerateSubmissionResult,
      ],
      submissionId,
      summary: {
        enqueueFailed: 0,
        invalid: 1,
        queued: 0,
        total: 1,
      },
    });

    return context.json(invalidResponse, 200);
  }

  const results = await Promise.all(
    items.map(async (item, index): Promise<ScenarioGenerateSubmissionResult> => {
      const payload = toScenarioGeneratePayload(item, submissionId, index);

      if (!payload) {
        return {
          cursor: index,
          error:
            "Each item requires a non-empty string message, optional string queuedAt, and optional boolean shouldFail",
          index,
          status: "invalid_input",
          submissionId,
        };
      }

      try {
        const jobId = crypto.randomUUID();

        await scenarioGenerateQueue.add(scenarioGenerateJobName, payload, {
          jobId,
        });

        await persistQueuedScenarioGenerateJob(jobId, payload);

        return {
          cursor: payload.cursor,
          index,
          jobId,
          payload,
          status: "queued",
          submissionId,
        };
      } catch (error) {
        return {
          cursor: payload.cursor,
          error: error instanceof Error ? error.message : "Failed to enqueue scenario generation job",
          index,
          payload,
          status: "enqueue_failed",
          submissionId,
        };
      }
    }),
  );

  const responseBody: ScenarioGenerateSubmissionResponse = scenarioGenerateSubmissionResponseSchema.parse({
    eventsUrl: createScenarioGenerateEventsUrl({
      limit: scenarioGenerateDefaultEventsLimit,
      submissionId,
    }),
    limit: scenarioGenerateDefaultEventsLimit,
    results,
    submissionId,
    summary: {
      enqueueFailed: results.filter((result) => result.status === "enqueue_failed").length,
      invalid: results.filter((result) => result.status === "invalid_input").length,
      queued: results.filter((result) => result.status === "queued").length,
      total: results.length,
    },
  });

  return context.json(responseBody, 200);
});

app.get(scenarioGenerateEventsPath, async (context) => {
  const parsedQuery = scenarioGenerateEventsQuerySchema.safeParse(context.req.query());

  if (!parsedQuery.success) {
    return context.json(
      {
        error: "Invalid events query parameters",
      },
      400,
    );
  }

  const { cursor, limit, submissionId } = parsedQuery.data;

  return streamChannelJobProgressSSE(context, {
    channel: scenarioGenerateProgressChannel,
    eventName: scenarioGenerateUpdatedEvent,
    getInitialMessages: submissionId
      ? () =>
          getScenarioGenerateSnapshots({
            cursor,
            limit,
            submissionId,
          })
      : async () => [],
    getMessageId: (message) => String(message.cursor),
    shouldIncludeMessage: submissionId
      ? (message) => message.submissionId === submissionId && (typeof cursor !== "number" || message.cursor > cursor)
      : () => false,
    subscriberName: submissionId
      ? `${scenarioGenerateEventsSubscriberPrefix}.${submissionId}`
      : `${scenarioGenerateEventsSubscriberPrefix}.idle`,
  });
});

console.log(`backend api listening on http://localhost:${port}`);

export default {
  fetch: app.fetch,
  port,
};
