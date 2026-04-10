import {
  adminKnowledgeOccurrencesQuerySchema,
  adminKnowledgeOccurrencesResponseSchema,
  assignKnowledgeOccurrenceSchema,
  communicativeFunctions,
  fixednessLevels,
  knowledgeItemListQuerySchema,
  resolveKnowledgeOccurrenceSchema,
  syntaxRoles,
} from "@english-coach/contract";
import {
  adminKnowledgeItemCreateSchema,
  adminKnowledgeItemUpdateSchema,
} from "@english-coach/contract/knowledge-generate";
import { db } from "@english-coach/database";
import { knowledgeItems, sessionKnowledgePointOccurrences } from "@english-coach/database/schema";
import { and, asc, count, desc, eq, isNull, like, or } from "drizzle-orm";
import type { BackendApp } from "../http/context";
import { parseJsonBody } from "../http/context";
import { createPageResponse, getPageOffset, normalizePageQuery } from "../http/pagination";
import { knowledgeOccurrenceResolveQueue } from "../lib/queues/knowledge-occurrence.resolve";

const knowledgeItemSortColumnMap = {
  createdAt: knowledgeItems.createdAt,
  isPendingReview: knowledgeItems.isPendingReview,
  pattern: knowledgeItems.pattern,
  updatedAt: knowledgeItems.updatedAt,
} as const;

function createKnowledgeItemSearchCondition(search?: string) {
  if (!search) {
    return null;
  }

  const pattern = `%${search}%`;

  return like(knowledgeItems.pattern, pattern);
}

export function registerAdminRoutes(app: BackendApp) {
  app.get("/api/admin/knowledge-occurrences", async (context) => {
    const parsedQuery = adminKnowledgeOccurrencesQuerySchema.safeParse(normalizePageQuery(context.req.query()));

    if (!parsedQuery.success) {
      return context.json({ error: "Invalid knowledge occurrence query parameters" }, 400);
    }

    const { page, pageSize, search } = parsedQuery.data;
    const offset = getPageOffset(page, pageSize);
    const conditions = [
      isNull(sessionKnowledgePointOccurrences.knowledgeItemId),
      search
        ? or(
            like(sessionKnowledgePointOccurrences.proposedPattern, `%${search}%`),
            like(sessionKnowledgePointOccurrences.utterance, `%${search}%`),
          )
        : null,
    ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
    const whereCondition = and(...conditions);

    const [rows, totalResult] = await Promise.all([
      db
        .select()
        .from(sessionKnowledgePointOccurrences)
        .where(whereCondition)
        .orderBy(desc(sessionKnowledgePointOccurrences.id))
        .limit(pageSize)
        .offset(offset),
      db.select({ total: count() }).from(sessionKnowledgePointOccurrences).where(whereCondition),
    ]);

    return context.json(
      adminKnowledgeOccurrencesResponseSchema.parse(
        createPageResponse(
          rows.map((row) => ({
            id: row.id,
            knowledgeItemId: row.knowledgeItemId,
            proposedPattern: row.proposedPattern,
            sessionHistoryId: row.sessionHistoryId,
            transcriptTurnIndex: row.transcriptTurnIndex,
            utterance: row.utterance,
          })),
          totalResult[0]?.total ?? 0,
          page,
          pageSize,
        ),
      ),
    );
  });

  app.patch("/api/admin/knowledge-occurrences/:id", async (context) => {
    const parsedBody = await parseJsonBody(context, assignKnowledgeOccurrenceSchema);

    if (!parsedBody.success) {
      return parsedBody.response;
    }

    const occurrenceId = context.req.param("id");
    const [existingOccurrence] = await db
      .select()
      .from(sessionKnowledgePointOccurrences)
      .where(eq(sessionKnowledgePointOccurrences.id, occurrenceId))
      .limit(1);

    if (!existingOccurrence) {
      return context.json({ error: "Knowledge occurrence not found" }, 404);
    }

    const [existingKnowledgeItem] = await db
      .select({ id: knowledgeItems.id })
      .from(knowledgeItems)
      .where(eq(knowledgeItems.id, parsedBody.data.knowledgeItemId))
      .limit(1);

    if (!existingKnowledgeItem) {
      return context.json({ error: "Knowledge item not found" }, 404);
    }

    await db
      .update(sessionKnowledgePointOccurrences)
      .set({ knowledgeItemId: existingKnowledgeItem.id })
      .where(eq(sessionKnowledgePointOccurrences.id, occurrenceId));

    return context.json({ id: occurrenceId, knowledgeItemId: existingKnowledgeItem.id });
  });

  app.post("/api/admin/knowledge-occurrences/resolve", async (context) => {
    const parsedBody = await parseJsonBody(context, resolveKnowledgeOccurrenceSchema);

    if (!parsedBody.success) {
      return parsedBody.response;
    }

    const job = await knowledgeOccurrenceResolveQueue.add(
      "knowledgeOccurrenceResolve",
      { occurrenceId: parsedBody.data.occurrenceId },
      {
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return context.json({ jobId: String(job.id), occurrenceId: parsedBody.data.occurrenceId }, 202);
  });

  app.get("/api/admin/knowledge-items", async (context) => {
    const parsedQuery = knowledgeItemListQuerySchema.safeParse(normalizePageQuery(context.req.query()));

    if (!parsedQuery.success) {
      return context.json({ error: "Invalid knowledge item query parameters" }, 400);
    }

    const {
      communicativeFunction,
      fixednessLevel,
      isPendingReview,
      page,
      pageSize,
      search,
      sortBy,
      sortDirection,
      syntaxRole,
    } = parsedQuery.data;
    const offset = getPageOffset(page, pageSize);
    const conditions = [
      isPendingReview === undefined ? null : eq(knowledgeItems.isPendingReview, isPendingReview),
      syntaxRole ? eq(knowledgeItems.syntaxRole, syntaxRole) : null,
      fixednessLevel ? eq(knowledgeItems.fixednessLevel, fixednessLevel) : null,
      communicativeFunction ? eq(knowledgeItems.communicativeFunction, communicativeFunction) : null,
      createKnowledgeItemSearchCondition(search),
    ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
    const filterCondition = conditions.length > 0 ? and(...conditions) : undefined;
    const orderColumn = knowledgeItemSortColumnMap[sortBy];
    const orderExpression = sortDirection === "asc" ? asc(orderColumn) : desc(orderColumn);
    const baseQuery = db.select().from(knowledgeItems);

    const [records, totalResult] = await Promise.all([
      baseQuery.where(filterCondition).orderBy(orderExpression, desc(knowledgeItems.id)).limit(pageSize).offset(offset),
      db.select({ total: count() }).from(knowledgeItems).where(filterCondition),
    ]);

    return context.json(createPageResponse(records, totalResult[0]?.total ?? 0, page, pageSize));
  });

  app.post("/api/admin/knowledge-items", async (context) => {
    const parsedBody = await parseJsonBody(context, adminKnowledgeItemCreateSchema);

    if (!parsedBody.success) {
      return parsedBody.response;
    }

    const now = new Date().toISOString();
    const knowledgeItemId = crypto.randomUUID();

    await db.insert(knowledgeItems).values({
      communicativeFunction: parsedBody.data.communicativeFunction ?? null,
      createdAt: now,
      fixednessLevel: parsedBody.data.fixednessLevel ?? null,
      id: knowledgeItemId,
      isPendingReview: parsedBody.data.isPendingReview ?? false,
      pattern: parsedBody.data.pattern,
      senses: [],
      syntaxRole: parsedBody.data.syntaxRole ?? null,
      updatedAt: now,
    });

    const [record] = await db.select().from(knowledgeItems).where(eq(knowledgeItems.id, knowledgeItemId)).limit(1);

    return context.json(record, 201);
  });

  app.patch("/api/admin/knowledge-items/:id", async (context) => {
    const parsedBody = await parseJsonBody(context, adminKnowledgeItemUpdateSchema);

    if (!parsedBody.success) {
      return parsedBody.response;
    }

    const knowledgeItemId = context.req.param("id");
    const [existingRecord] = await db
      .select()
      .from(knowledgeItems)
      .where(eq(knowledgeItems.id, knowledgeItemId))
      .limit(1);

    if (!existingRecord) {
      return context.json({ error: "Knowledge item not found" }, 404);
    }

    const now = new Date().toISOString();

    await db
      .update(knowledgeItems)
      .set({
        communicativeFunction:
          parsedBody.data.communicativeFunction === undefined
            ? existingRecord.communicativeFunction
            : parsedBody.data.communicativeFunction,
        fixednessLevel:
          parsedBody.data.fixednessLevel === undefined ? existingRecord.fixednessLevel : parsedBody.data.fixednessLevel,
        isPendingReview:
          parsedBody.data.isPendingReview === undefined
            ? existingRecord.isPendingReview
            : parsedBody.data.isPendingReview,
        pattern: parsedBody.data.pattern ?? existingRecord.pattern,
        syntaxRole: parsedBody.data.syntaxRole === undefined ? existingRecord.syntaxRole : parsedBody.data.syntaxRole,
        updatedAt: now,
      })
      .where(eq(knowledgeItems.id, knowledgeItemId));

    const [record] = await db.select().from(knowledgeItems).where(eq(knowledgeItems.id, knowledgeItemId)).limit(1);

    return context.json(record);
  });

  app.delete("/api/admin/knowledge-items/:id", async (context) => {
    const knowledgeItemId = context.req.param("id");
    const [existingRecord] = await db
      .select()
      .from(knowledgeItems)
      .where(eq(knowledgeItems.id, knowledgeItemId))
      .limit(1);

    if (!existingRecord) {
      return context.json({ error: "Knowledge item not found" }, 404);
    }

    await db.delete(knowledgeItems).where(eq(knowledgeItems.id, knowledgeItemId));

    return new Response(null, { status: 204 });
  });
}
