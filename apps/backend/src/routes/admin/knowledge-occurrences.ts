import {
  adminKnowledgeOccurrenceListQueryWithStatusSchema,
  adminKnowledgeOccurrenceListResponseWithStatusSchema,
  adminLinkKnowledgeOccurrenceResponseSchema,
  adminRejectKnowledgeOccurrenceResponseSchema,
  adminRejectKnowledgeOccurrenceSchema,
  assignKnowledgeOccurrenceSchema,
  knowledgeOccurrenceResolveJobName,
  resolveKnowledgeOccurrenceSchema,
} from "@english-coach/contract/knowledge";
import { db } from "@english-coach/database";
import {
  knowledgeItems,
  scenarios,
  sessionHistory,
  sessionKnowledgePointOccurrences,
} from "@english-coach/database/schema";
import { and, count, desc, eq, like, or } from "drizzle-orm";
import type { BackendApp } from "../../http/context";
import { getAuthenticatedUser, parseJsonBody } from "../../http/context";
import { createPageResponse, getPageOffset, normalizePageQuery } from "../../http/pagination";
import { knowledgeOccurrenceResolveQueue } from "../../lib/queues/knowledge-occurrence.resolve";

export function registerAdminKnowledgeOccurrenceRoutes(app: BackendApp) {
  // List knowledge occurrences that need admin review or have already been reviewed.
  app.get("/api/admin/knowledge-occurrences", async (context) => {
    const parsedQuery = adminKnowledgeOccurrenceListQueryWithStatusSchema.safeParse(
      normalizePageQuery(context.req.query()),
    );

    if (!parsedQuery.success) {
      return context.json({ error: "Invalid knowledge occurrence query parameters" }, 400);
    }

    const { page, pageSize, search, status } = parsedQuery.data;
    const offset = getPageOffset(page, pageSize);
    const conditions = [
      status ? eq(sessionKnowledgePointOccurrences.status, status) : null,
      search
        ? or(
            like(sessionKnowledgePointOccurrences.proposedPattern, `%${search}%`),
            like(sessionKnowledgePointOccurrences.utterance, `%${search}%`),
          )
        : null,
    ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalResult] = await Promise.all([
      db
        .select({
          id: sessionKnowledgePointOccurrences.id,
          knowledgeItemId: sessionKnowledgePointOccurrences.knowledgeItemId,
          proposedPattern: sessionKnowledgePointOccurrences.proposedPattern,
          reviewedAt: sessionKnowledgePointOccurrences.reviewedAt,
          sessionHistoryId: sessionKnowledgePointOccurrences.sessionHistoryId,
          scenarioTitle: scenarios.title,
          sessionType: sessionHistory.sessionType,
          status: sessionKnowledgePointOccurrences.status,
          transcriptTurnIndex: sessionKnowledgePointOccurrences.transcriptTurnIndex,
          utterance: sessionKnowledgePointOccurrences.utterance,
        })
        .from(sessionKnowledgePointOccurrences)
        .innerJoin(sessionHistory, eq(sessionKnowledgePointOccurrences.sessionHistoryId, sessionHistory.id))
        .leftJoin(scenarios, eq(sessionHistory.scenarioId, scenarios.id))
        .where(whereCondition)
        .orderBy(
          desc(sessionKnowledgePointOccurrences.reviewedAt),
          desc(sessionKnowledgePointOccurrences.sessionHistoryId),
          desc(sessionKnowledgePointOccurrences.transcriptTurnIndex),
          desc(sessionKnowledgePointOccurrences.id),
        )
        .limit(pageSize)
        .offset(offset),
      db.select({ total: count() }).from(sessionKnowledgePointOccurrences).where(whereCondition),
    ]);

    return context.json(
      adminKnowledgeOccurrenceListResponseWithStatusSchema.parse(
        createPageResponse(
          rows.map((row) => ({
            id: row.id,
            knowledgeItemId: row.knowledgeItemId,
            proposedPattern: row.proposedPattern,
            reviewedAt: row.reviewedAt,
            sessionHistoryId: row.sessionHistoryId,
            sessionTitle: row.sessionType === "free-form" ? "Free-form" : row.scenarioTitle,
            status: row.status,
            transcriptExcerpt: row.utterance,
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

  // Link a detected knowledge occurrence to an existing knowledge item.
  app.patch("/api/admin/knowledge-occurrences/:id", async (context) => {
    const parsedBody = await parseJsonBody(context, assignKnowledgeOccurrenceSchema);

    if (!parsedBody.success) {
      return parsedBody.response;
    }

    const currentUser = getAuthenticatedUser(context);
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
      .set({
        knowledgeItemId: existingKnowledgeItem.id,
        reviewedAt: new Date().toISOString(),
        reviewedByUserId: currentUser?.id ?? null,
        status: "approved",
      })
      .where(eq(sessionKnowledgePointOccurrences.id, occurrenceId));

    return context.json(
      adminLinkKnowledgeOccurrenceResponseSchema.parse({
        id: occurrenceId,
        knowledgeItemId: existingKnowledgeItem.id,
        status: "approved",
      }),
    );
  });

  // Reject a detected knowledge occurrence and store the optional review reason.
  app.post("/api/admin/knowledge-occurrences/:id/reject", async (context) => {
    const parsedBody = await parseJsonBody(context, adminRejectKnowledgeOccurrenceSchema);

    if (!parsedBody.success) {
      return parsedBody.response;
    }

    const currentUser = getAuthenticatedUser(context);
    const occurrenceId = context.req.param("id");
    const [existingOccurrence] = await db
      .select({ id: sessionKnowledgePointOccurrences.id })
      .from(sessionKnowledgePointOccurrences)
      .where(eq(sessionKnowledgePointOccurrences.id, occurrenceId))
      .limit(1);

    if (!existingOccurrence) {
      return context.json({ error: "Knowledge occurrence not found" }, 404);
    }

    await db
      .update(sessionKnowledgePointOccurrences)
      .set({
        rejectionReason: parsedBody.data.reason ?? null,
        reviewedAt: new Date().toISOString(),
        reviewedByUserId: currentUser?.id ?? null,
        status: "rejected",
      })
      .where(eq(sessionKnowledgePointOccurrences.id, occurrenceId));

    return context.json(
      adminRejectKnowledgeOccurrenceResponseSchema.parse({
        id: occurrenceId,
        status: "rejected",
      }),
    );
  });

  // Queue AI-assisted resolution for a knowledge occurrence.
  app.post("/api/admin/knowledge-occurrences/resolve", async (context) => {
    const parsedBody = await parseJsonBody(context, resolveKnowledgeOccurrenceSchema);

    if (!parsedBody.success) {
      return parsedBody.response;
    }

    const job = await knowledgeOccurrenceResolveQueue.add(
      knowledgeOccurrenceResolveJobName,
      { occurrenceId: parsedBody.data.occurrenceId },
      {
        jobId: `${knowledgeOccurrenceResolveJobName}-${parsedBody.data.occurrenceId}`,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return context.json({ jobId: String(job.id), occurrenceId: parsedBody.data.occurrenceId }, 202);
  });
}
