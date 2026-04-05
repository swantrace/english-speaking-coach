import {
  communicativeFunctions,
  fixednessLevels,
  knowledgeItemListQuerySchema,
  knowledgeItemReviewStatusSchema,
  syntaxRoles,
} from "@english-coach/contract";
import {
  adminKnowledgeItemCreateSchema,
  adminKnowledgeItemUpdateSchema,
} from "@english-coach/contract/knowledge-generate";
import { db } from "@english-coach/database";
import { knowledgeItems } from "@english-coach/database/schema";
import { and, asc, count, desc, eq, like, or } from "drizzle-orm";
import type { BackendApp } from "../http/context";
import { parseJsonBody } from "../http/context";
import { createPageResponse, getPageOffset, normalizePageQuery } from "../http/pagination";

const knowledgeItemSortColumnMap = {
  createdAt: knowledgeItems.createdAt,
  pattern: knowledgeItems.pattern,
  reviewStatus: knowledgeItems.reviewStatus,
  source: knowledgeItems.source,
  updatedAt: knowledgeItems.updatedAt,
} as const;

function createKnowledgeItemSearchCondition(search?: string) {
  if (!search) {
    return null;
  }

  const pattern = `%${search}%`;

  return or(like(knowledgeItems.pattern, pattern), like(knowledgeItems.example, pattern));
}

export function registerAdminRoutes(app: BackendApp) {
  app.get("/api/admin/knowledge-items", async (context) => {
    const parsedQuery = knowledgeItemListQuerySchema.safeParse(normalizePageQuery(context.req.query()));

    if (!parsedQuery.success) {
      return context.json({ error: "Invalid knowledge item query parameters" }, 400);
    }

    const {
      communicativeFunction,
      fixednessLevel,
      page,
      pageSize,
      reviewStatus,
      search,
      sortBy,
      sortDirection,
      source,
      syntaxRole,
    } = parsedQuery.data;
    const offset = getPageOffset(page, pageSize);
    const conditions = [
      source ? eq(knowledgeItems.source, source) : null,
      reviewStatus ? eq(knowledgeItems.reviewStatus, reviewStatus) : null,
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
      example: parsedBody.data.example ?? null,
      fixednessLevel: parsedBody.data.fixednessLevel ?? null,
      id: knowledgeItemId,
      pattern: parsedBody.data.pattern,
      reviewStatus: parsedBody.data.reviewStatus,
      reviewedAt: parsedBody.data.reviewStatus === knowledgeItemReviewStatusSchema.enum.pending_review ? null : now,
      reviewedByUserId:
        parsedBody.data.reviewStatus === knowledgeItemReviewStatusSchema.enum.pending_review
          ? null
          : (context.get("user")?.id ?? null),
      source: parsedBody.data.source,
      submissionId: null,
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

    const nextReviewStatus = parsedBody.data.reviewStatus ?? existingRecord.reviewStatus;
    const now = new Date().toISOString();

    await db
      .update(knowledgeItems)
      .set({
        communicativeFunction:
          parsedBody.data.communicativeFunction === undefined
            ? existingRecord.communicativeFunction
            : parsedBody.data.communicativeFunction,
        example: parsedBody.data.example === undefined ? existingRecord.example : parsedBody.data.example,
        fixednessLevel:
          parsedBody.data.fixednessLevel === undefined ? existingRecord.fixednessLevel : parsedBody.data.fixednessLevel,
        pattern: parsedBody.data.pattern ?? existingRecord.pattern,
        source: parsedBody.data.source ?? existingRecord.source,
        syntaxRole: parsedBody.data.syntaxRole === undefined ? existingRecord.syntaxRole : parsedBody.data.syntaxRole,
        reviewStatus: nextReviewStatus,
        reviewedAt: nextReviewStatus === knowledgeItemReviewStatusSchema.enum.pending_review ? null : now,
        reviewedByUserId:
          nextReviewStatus === knowledgeItemReviewStatusSchema.enum.pending_review
            ? null
            : (context.get("user")?.id ?? null),
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
