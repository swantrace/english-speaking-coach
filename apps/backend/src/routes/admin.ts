import { communicativeFunctions, fixednessLevels, syntaxRoles } from "@english-coach/contract";
import { db } from "@english-coach/database";
import { knowledgeItems } from "@english-coach/database/schema";
import { count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { BackendApp } from "../http/context";
import { parseJsonBody } from "../http/context";
import { createPaginatedResponse, paginationQuerySchema } from "../http/pagination";

const knowledgeItemSourceSchema = z.enum(["admin", "auto_generated"]);
const adminKnowledgeItemCreateSchema = z.object({
  communicativeFunction: z.enum(communicativeFunctions).nullable().optional(),
  example: z.string().trim().min(1).nullable().optional(),
  fixednessLevel: z.enum(fixednessLevels).nullable().optional(),
  pattern: z.string().trim().min(1),
  source: knowledgeItemSourceSchema.default("admin"),
  syntaxRole: z.enum(syntaxRoles).nullable().optional(),
});
const adminKnowledgeItemPatchSchema = adminKnowledgeItemCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");
const knowledgeItemsQuerySchema = paginationQuerySchema.extend({
  source: knowledgeItemSourceSchema.optional(),
});

export function registerAdminRoutes(app: BackendApp) {
  app.get("/api/admin/knowledge-items", async (context) => {
    const parsedQuery = knowledgeItemsQuerySchema.safeParse(context.req.query());

    if (!parsedQuery.success) {
      return context.json({ error: "Invalid knowledge item query parameters" }, 400);
    }

    const filterCondition = parsedQuery.data.source ? eq(knowledgeItems.source, parsedQuery.data.source) : null;
    const { limit, offset } = parsedQuery.data;
    const baseQuery = db.select().from(knowledgeItems);

    const [records, totalResult] = await Promise.all([
      filterCondition
        ? baseQuery.where(filterCondition).orderBy(desc(knowledgeItems.updatedAt)).limit(limit).offset(offset)
        : baseQuery.orderBy(desc(knowledgeItems.updatedAt)).limit(limit).offset(offset),
      filterCondition
        ? db.select({ total: count() }).from(knowledgeItems).where(filterCondition)
        : db.select({ total: count() }).from(knowledgeItems),
    ]);

    return context.json(createPaginatedResponse(records, totalResult[0]?.total ?? 0, limit, offset));
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
      source: parsedBody.data.source,
      syntaxRole: parsedBody.data.syntaxRole ?? null,
      updatedAt: now,
    });

    const [record] = await db.select().from(knowledgeItems).where(eq(knowledgeItems.id, knowledgeItemId)).limit(1);

    return context.json(record, 201);
  });

  app.patch("/api/admin/knowledge-items/:id", async (context) => {
    const parsedBody = await parseJsonBody(context, adminKnowledgeItemPatchSchema);

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
        updatedAt: new Date().toISOString(),
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
