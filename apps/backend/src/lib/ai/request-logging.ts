import { db } from "@english-coach/database";
import { aiModelRequests, aiToolCalls } from "@english-coach/database/schema";
import { eq } from "drizzle-orm";

type JsonRecord = Record<string, unknown>;

export type AiRequestLogContext = {
  knowledgeItemId?: string | null;
  metadata?: JsonRecord;
  scenarioId?: string | null;
  sessionHistoryId?: string | null;
  submissionId?: string | null;
  submissionJobId?: string | null;
};

export type AiToolCallLogInput = AiRequestLogContext & {
  aiModelRequestId?: string | null;
  completedAt?: string | null;
  error?: unknown;
  input?: unknown;
  latencyMs?: number | null;
  output?: unknown;
  startedAt?: string;
  status: "started" | "completed" | "failed";
  toolCallId?: string | null;
  toolName: string;
};

function serializeError(error: unknown): unknown {
  if (!(error instanceof Error)) {
    return error;
  }

  return {
    message: error.message,
    name: error.name,
    stack: error.stack,
  };
}

function toJsonSafe(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value === undefined) {
    return null;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonSafe(item, seen));
  }

  if (typeof value !== "object") {
    return String(value);
  }

  if (seen.has(value)) {
    return "[Circular]";
  }

  seen.add(value);

  return Object.fromEntries(Object.entries(value as JsonRecord).map(([key, entry]) => [key, toJsonSafe(entry, seen)]));
}

function jsonOrNull(value: unknown) {
  return toJsonSafe(value);
}

function numberOrNull(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getRecordValue(value: unknown, key: string) {
  return value && typeof value === "object" && key in value ? (value as JsonRecord)[key] : undefined;
}

function extractUsage(result: unknown) {
  return getRecordValue(result, "usage") ?? getRecordValue(result, "totalUsage");
}

function extractRawOutput(result: unknown) {
  const rawOutput: JsonRecord = {};

  for (const key of [
    "text",
    "reasoning",
    "files",
    "sources",
    "finishReason",
    "providerMetadata",
    "response",
    "warnings",
  ]) {
    const value = getRecordValue(result, key);

    if (value !== undefined) {
      rawOutput[key] = value;
    }
  }

  return Object.keys(rawOutput).length > 0 ? rawOutput : undefined;
}

export async function recordAiModelRequest<TResult extends { output?: unknown }>({
  context,
  input,
  modelId,
  operation,
  providerId,
  run,
}: {
  context?: AiRequestLogContext;
  input: unknown;
  modelId: string;
  operation: string;
  providerId: string;
  run: () => Promise<TResult>;
}): Promise<TResult> {
  const id = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const startedAtMs = Date.now();

  await db.insert(aiModelRequests).values({
    id,
    input: jsonOrNull(input),
    knowledgeItemId: context?.knowledgeItemId ?? null,
    metadata: jsonOrNull(context?.metadata),
    modelId,
    operation,
    providerId,
    scenarioId: context?.scenarioId ?? null,
    sessionHistoryId: context?.sessionHistoryId ?? null,
    startedAt,
    status: "started",
    submissionId: context?.submissionId ?? null,
    submissionJobId: context?.submissionJobId ?? null,
  });

  try {
    const result = await run();
    const completedAt = new Date().toISOString();

    await db
      .update(aiModelRequests)
      .set({
        completedAt,
        latencyMs: Date.now() - startedAtMs,
        output: jsonOrNull(result.output),
        rawOutput: jsonOrNull(extractRawOutput(result)),
        status: "completed",
        usage: jsonOrNull(extractUsage(result)),
      })
      .where(eq(aiModelRequests.id, id));

    return result;
  } catch (error) {
    const completedAt = new Date().toISOString();

    await db
      .update(aiModelRequests)
      .set({
        completedAt,
        error: jsonOrNull(serializeError(error)),
        latencyMs: Date.now() - startedAtMs,
        status: "failed",
      })
      .where(eq(aiModelRequests.id, id));

    throw error;
  }
}

export async function recordAiToolCall(input: AiToolCallLogInput) {
  const startedAt = input.startedAt ?? new Date().toISOString();

  await db.insert(aiToolCalls).values({
    aiModelRequestId: input.aiModelRequestId ?? null,
    completedAt: input.completedAt ?? null,
    error: jsonOrNull(serializeError(input.error)),
    id: crypto.randomUUID(),
    input: jsonOrNull(input.input),
    knowledgeItemId: input.knowledgeItemId ?? null,
    latencyMs: numberOrNull(input.latencyMs),
    metadata: jsonOrNull(input.metadata),
    output: jsonOrNull(input.output),
    scenarioId: input.scenarioId ?? null,
    sessionHistoryId: input.sessionHistoryId ?? null,
    startedAt,
    status: input.status,
    submissionId: input.submissionId ?? null,
    submissionJobId: input.submissionJobId ?? null,
    toolCallId: input.toolCallId ?? null,
    toolName: input.toolName,
  });
}
