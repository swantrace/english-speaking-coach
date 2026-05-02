import {
  adminKnowledgeCreateSchema,
  adminKnowledgeDetailSchema,
  adminKnowledgeListQuerySchema,
  adminKnowledgeListResponseSchema,
  adminKnowledgeUpdateSchema,
} from "@english-coach/contract/knowledge";
import { db } from "@english-coach/database";
import { knowledgeItems } from "@english-coach/database/schema";
import { and, asc, count, desc, eq, like } from "drizzle-orm";
import type { BackendApp } from "../../http/context";
import { parseJsonBody } from "../../http/context";
import { createPageResponse, getPageOffset, normalizePageQuery } from "../../http/pagination";

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

export function registerAdminKnowledgeItemRoutes(app: BackendApp) {
  // List knowledge items for admin search, filtering, sorting, and review.
  app.get("/api/admin/knowledge-items", async (context) => {
    const parsedQuery = adminKnowledgeListQuerySchema.safeParse(normalizePageQuery(context.req.query()));

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

    return context.json(
      adminKnowledgeListResponseSchema.parse(createPageResponse(records, totalResult[0]?.total ?? 0, page, pageSize)),
    );
  });

  // Fetch one knowledge item for admin detail and editing views.
  app.get("/api/admin/knowledge-items/:id", async (context) => {
    const knowledgeItemId = context.req.param("id");
    const [record] = await db.select().from(knowledgeItems).where(eq(knowledgeItems.id, knowledgeItemId)).limit(1);

    if (!record) {
      return context.json({ error: "Knowledge item not found" }, 404);
    }

    return context.json(adminKnowledgeDetailSchema.parse(record));
  });

  // Create a knowledge item manually from admin input.
  app.post("/api/admin/knowledge-items", async (context) => {
    const parsedBody = await parseJsonBody(context, adminKnowledgeCreateSchema);

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
      senses: parsedBody.data.senses,
      syntaxRole: parsedBody.data.syntaxRole ?? null,
      updatedAt: now,
    });

    const [record] = await db.select().from(knowledgeItems).where(eq(knowledgeItems.id, knowledgeItemId)).limit(1);

    return context.json(record, 201);
  });

  // Update an existing knowledge item from admin edits.
  app.patch("/api/admin/knowledge-items/:id", async (context) => {
    const parsedBody = await parseJsonBody(context, adminKnowledgeUpdateSchema);

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
        senses: parsedBody.data.senses ?? existingRecord.senses,
        syntaxRole: parsedBody.data.syntaxRole === undefined ? existingRecord.syntaxRole : parsedBody.data.syntaxRole,
        updatedAt: now,
      })
      .where(eq(knowledgeItems.id, knowledgeItemId));

    const [record] = await db.select().from(knowledgeItems).where(eq(knowledgeItems.id, knowledgeItemId)).limit(1);

    return context.json(record);
  });

  // Delete a knowledge item from the admin catalog.
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
