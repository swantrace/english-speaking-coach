import {
  createScenarioGenerateEventsUrl,
  type ScenarioGenerateSubmissionResponse,
  type ScenarioGenerateSubmissionResult,
  scenarioGenerateDefaultEventsLimit,
  scenarioGenerateEventsQuerySchema,
  scenarioGenerateEventsSubscriberPrefix,
  scenarioGenerateJobName,
  scenarioGenerateSubmissionItemSchema,
  scenarioGenerateSubmissionResponseSchema,
  scenarioGenerateSubmissionTransportRequestSchema,
  scenarioGenerateUpdatedEvent,
} from "@english-coach/contract/scenario";
import type { BackendApp } from "../http/context";
import { getAuthenticatedUser } from "../http/context";
import {
  createScenarioGenerateSubmission,
  getScenarioGenerateSnapshots,
  persistQueuedScenarioGenerateJob,
  type ScenarioGenerateJobData,
  type ScenarioGenerateProgressMessage,
  scenarioGenerateProgressChannel,
  scenarioGenerateQueue,
} from "../lib/queues/scenario.generate";
import { streamChannelJobProgressSSE } from "../lib/sse/job-events";

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

function getScenarioGenerateSseMaxDurationMs() {
  const rawValue = process.env.SCENARIO_GENERATE_SSE_MAX_DURATION_MS;

  if (!rawValue) {
    return undefined;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return undefined;
  }

  return parsedValue;
}

export function registerScenarioGenerateRoutes(app: BackendApp) {
  // Queue one or more prompts for AI-generated scenarios.
  app.post("/api/scenarios/generate", async (context) => {
    const rawBody = await context.req.json<unknown>().catch(() => ({}));
    const items = normalizeGenerateRequestItems(rawBody);
    const submissionId = crypto.randomUUID();
    const currentUser = getAuthenticatedUser(context);

    await createScenarioGenerateSubmission(submissionId, items.length === 0 ? 1 : items.length, currentUser?.id);

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
            error: "Each item requires a non-empty string message, optional string queuedAt",
            index,
            status: "invalid_input",
            submissionId,
          };
        }

        try {
          const jobId = crypto.randomUUID();

          await scenarioGenerateQueue.add(scenarioGenerateJobName, payload, {
            jobId,
            removeOnComplete: { age: 86_400, count: 1_000 },
            removeOnFail: false,
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

  // Stream queued scenario generation progress for a submission over SSE.
  app.get("/api/scenarios/generate/events", async (context) => {
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

    return streamChannelJobProgressSSE<ScenarioGenerateProgressMessage>(context, {
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
      maxDurationMs: getScenarioGenerateSseMaxDurationMs(),
      subscriberName: submissionId
        ? `${scenarioGenerateEventsSubscriberPrefix}.${submissionId}`
        : `${scenarioGenerateEventsSubscriberPrefix}.idle`,
    });
  });
}
