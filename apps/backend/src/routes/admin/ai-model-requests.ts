import {
  adminAiModelRequestDetailSchema,
  adminAiModelRequestListQuerySchema,
  adminAiModelRequestListResponseSchema,
  adminAiModelRequestStatsResponseSchema,
} from "@english-coach/contract";
import { db } from "@english-coach/database";
import { aiModelRequests } from "@english-coach/database/schema";
import { and, avg, count, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import type { BackendApp } from "../../http/context";
import { createPageResponse, getPageOffset, normalizePageQuery } from "../../http/pagination";

const STATS_TREND_DAYS = 21;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

type AiModelRequestRecord = typeof aiModelRequests.$inferSelect;

function getUtcDayStart(timestampMs: number) {
  const date = new Date(timestampMs);

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function createTrendDays(nowMs = Date.now()) {
  const todayStartMs = getUtcDayStart(nowMs);

  return Array.from({ length: STATS_TREND_DAYS }, (_, index) => {
    const startMs = todayStartMs - (STATS_TREND_DAYS - index - 1) * MILLISECONDS_PER_DAY;

    return new Date(startMs).toISOString().slice(0, 10);
  });
}

function sumColumn(column: SQLiteColumn) {
  return sql<number>`coalesce(sum(${column}), 0)`;
}

function countCompleted() {
  return sql<number>`coalesce(sum(case when ${aiModelRequests.status} = 'completed' then 1 else 0 end), 0)`;
}

function countFailed() {
  return sql<number>`coalesce(sum(case when ${aiModelRequests.status} = 'failed' then 1 else 0 end), 0)`;
}

function numberOrZero(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function numberOrNull(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function mapTokenUsage(row: {
  cacheReadTokens: number | null;
  cacheWriteTokens: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  totalTokens: number | null;
}) {
  return {
    cacheReadTokens: row.cacheReadTokens,
    cacheWriteTokens: row.cacheWriteTokens,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    reasoningTokens: row.reasoningTokens,
    totalTokens: row.totalTokens,
  };
}

function mapRequestSummary(row: AiModelRequestRecord) {
  return {
    cacheReadTokens: row.cacheReadTokens,
    cacheWriteTokens: row.cacheWriteTokens,
    completedAt: row.completedAt,
    error: row.error ?? undefined,
    id: row.id,
    inputTokens: row.inputTokens,
    knowledgeItemId: row.knowledgeItemId,
    latencyMs: row.latencyMs,
    metadata: row.metadata ?? undefined,
    modelId: row.modelId,
    operation: row.operation,
    outputTokens: row.outputTokens,
    providerId: row.providerId,
    reasoningTokens: row.reasoningTokens,
    scenarioId: row.scenarioId,
    sessionHistoryId: row.sessionHistoryId,
    startedAt: row.startedAt,
    status: row.status,
    submissionId: row.submissionId,
    submissionJobId: row.submissionJobId,
    totalTokens: row.totalTokens,
  };
}

function mapRequestDetail(row: AiModelRequestRecord) {
  return {
    ...mapRequestSummary(row),
    input: row.input ?? undefined,
    output: row.output ?? undefined,
    rawOutput: row.rawOutput ?? undefined,
    usage: row.usage ?? undefined,
  };
}

function createSearchCondition(search?: string) {
  if (!search) {
    return null;
  }

  const pattern = `%${search}%`;

  return or(
    like(aiModelRequests.id, pattern),
    like(aiModelRequests.operation, pattern),
    like(aiModelRequests.providerId, pattern),
    like(aiModelRequests.modelId, pattern),
    like(aiModelRequests.submissionId, pattern),
    like(aiModelRequests.submissionJobId, pattern),
    like(aiModelRequests.sessionHistoryId, pattern),
    like(aiModelRequests.scenarioId, pattern),
    like(aiModelRequests.knowledgeItemId, pattern),
  );
}

function createRequestConditions(query: {
  from?: string;
  modelId?: string;
  operation?: string;
  providerId?: string;
  search?: string;
  status?: AiModelRequestRecord["status"];
  to?: string;
}) {
  return [
    query.from ? gte(aiModelRequests.startedAt, query.from) : null,
    query.to ? lte(aiModelRequests.startedAt, query.to) : null,
    query.modelId ? eq(aiModelRequests.modelId, query.modelId) : null,
    query.operation ? eq(aiModelRequests.operation, query.operation) : null,
    query.providerId ? eq(aiModelRequests.providerId, query.providerId) : null,
    query.status ? eq(aiModelRequests.status, query.status) : null,
    createSearchCondition(query.search),
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
}

function aggregateTokenSelection() {
  return {
    cacheReadTokens: sumColumn(aiModelRequests.cacheReadTokens),
    cacheWriteTokens: sumColumn(aiModelRequests.cacheWriteTokens),
    inputTokens: sumColumn(aiModelRequests.inputTokens),
    outputTokens: sumColumn(aiModelRequests.outputTokens),
    reasoningTokens: sumColumn(aiModelRequests.reasoningTokens),
    totalTokens: sumColumn(aiModelRequests.totalTokens),
  };
}

function mapStatsGroup(row: {
  averageLatencyMs: number | string | null;
  cacheReadTokens: number | null;
  cacheWriteTokens: number | null;
  failedRequests: number | string | null;
  inputTokens: number | null;
  key: string;
  outputTokens: number | null;
  reasoningTokens: number | null;
  requests: number | string | null;
  totalTokens: number | null;
}) {
  return {
    averageLatencyMs: numberOrNull(row.averageLatencyMs),
    failedRequests: numberOrZero(row.failedRequests),
    key: row.key,
    label: row.key,
    requests: numberOrZero(row.requests),
    tokenUsage: mapTokenUsage(row),
  };
}

export function registerAdminAiModelRequestRoutes(app: BackendApp) {
  app.get("/api/admin/ai-model-requests/stats", async (context) => {
    const parsedQuery = adminAiModelRequestListQuerySchema
      .omit({ page: true, pageSize: true })
      .safeParse(context.req.query());

    if (!parsedQuery.success) {
      return context.json({ error: "Invalid AI model request stats query parameters" }, 400);
    }

    const conditions = createRequestConditions(parsedQuery.data);
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
    const requestDate = sql<string>`date(${aiModelRequests.startedAt})`;

    const [summaryRows, trendRows, modelRows, operationRows] = await Promise.all([
      db
        .select({
          averageLatencyMs: avg(aiModelRequests.latencyMs),
          failedRequests: countFailed(),
          requests: count(),
          successfulRequests: countCompleted(),
          ...aggregateTokenSelection(),
        })
        .from(aiModelRequests)
        .where(whereCondition),
      db
        .select({
          date: requestDate,
          requests: count(),
          totalTokens: sumColumn(aiModelRequests.totalTokens),
        })
        .from(aiModelRequests)
        .where(whereCondition)
        .groupBy(requestDate),
      db
        .select({
          averageLatencyMs: avg(aiModelRequests.latencyMs),
          failedRequests: countFailed(),
          key: sql<string>`${aiModelRequests.providerId} || '/' || ${aiModelRequests.modelId}`,
          requests: count(),
          ...aggregateTokenSelection(),
        })
        .from(aiModelRequests)
        .where(whereCondition)
        .groupBy(aiModelRequests.providerId, aiModelRequests.modelId)
        .orderBy(desc(sumColumn(aiModelRequests.totalTokens)))
        .limit(8),
      db
        .select({
          averageLatencyMs: avg(aiModelRequests.latencyMs),
          failedRequests: countFailed(),
          key: aiModelRequests.operation,
          requests: count(),
          ...aggregateTokenSelection(),
        })
        .from(aiModelRequests)
        .where(whereCondition)
        .groupBy(aiModelRequests.operation)
        .orderBy(desc(sumColumn(aiModelRequests.totalTokens)))
        .limit(8),
    ]);

    const summary = summaryRows[0];
    const trendByDate = new Map(
      trendRows.map((row) => [
        row.date,
        {
          date: row.date,
          requests: numberOrZero(row.requests),
          totalTokens: numberOrZero(row.totalTokens),
        },
      ]),
    );

    return context.json(
      adminAiModelRequestStatsResponseSchema.parse({
        byModel: modelRows.map(mapStatsGroup),
        byOperation: operationRows.map(mapStatsGroup),
        summary: {
          averageLatencyMs: numberOrNull(summary?.averageLatencyMs),
          failedRequests: numberOrZero(summary?.failedRequests),
          requests: numberOrZero(summary?.requests),
          successfulRequests: numberOrZero(summary?.successfulRequests),
          tokenUsage: mapTokenUsage({
            cacheReadTokens: numberOrZero(summary?.cacheReadTokens),
            cacheWriteTokens: numberOrZero(summary?.cacheWriteTokens),
            inputTokens: numberOrZero(summary?.inputTokens),
            outputTokens: numberOrZero(summary?.outputTokens),
            reasoningTokens: numberOrZero(summary?.reasoningTokens),
            totalTokens: numberOrZero(summary?.totalTokens),
          }),
        },
        trend: createTrendDays().map((date) => trendByDate.get(date) ?? { date, requests: 0, totalTokens: 0 }),
      }),
    );
  });

  app.get("/api/admin/ai-model-requests", async (context) => {
    const parsedQuery = adminAiModelRequestListQuerySchema.safeParse(normalizePageQuery(context.req.query()));

    if (!parsedQuery.success) {
      return context.json({ error: "Invalid AI model request query parameters" }, 400);
    }

    const { page, pageSize, ...filters } = parsedQuery.data;
    const conditions = createRequestConditions(filters);
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = getPageOffset(page, pageSize);

    const [requestRows, totalResult] = await Promise.all([
      db
        .select()
        .from(aiModelRequests)
        .where(whereCondition)
        .orderBy(desc(aiModelRequests.startedAt), desc(aiModelRequests.id))
        .limit(pageSize)
        .offset(offset),
      db.select({ total: count() }).from(aiModelRequests).where(whereCondition),
    ]);

    return context.json(
      adminAiModelRequestListResponseSchema.parse(
        createPageResponse(requestRows.map(mapRequestSummary), totalResult[0]?.total ?? 0, page, pageSize),
      ),
    );
  });

  app.get("/api/admin/ai-model-requests/:requestId", async (context) => {
    const requestId = context.req.param("requestId");
    const [request] = await db.select().from(aiModelRequests).where(eq(aiModelRequests.id, requestId)).limit(1);

    if (!request) {
      return context.json({ error: "AI model request not found" }, 404);
    }

    return context.json(adminAiModelRequestDetailSchema.parse(mapRequestDetail(request)));
  });
}
