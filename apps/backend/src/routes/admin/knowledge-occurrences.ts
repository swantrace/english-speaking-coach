import {
  adminApproveKnowledgeOccurrenceResponseSchema,
  adminApproveKnowledgeOccurrenceSchema,
  adminKnowledgeOccurrenceListQueryWithStatusSchema,
  adminKnowledgeOccurrenceListResponseWithStatusSchema,
  adminLinkKnowledgeOccurrenceResponseSchema,
  adminRejectKnowledgeOccurrenceResponseSchema,
  adminRejectKnowledgeOccurrenceSchema,
  assignKnowledgeOccurrenceSchema,
  knowledgeOccurrenceEnrichJobName,
  resolveKnowledgeOccurrenceSchema,
} from "@english-coach/contract/knowledge";
import { db } from "@english-coach/database";
import {
  knowledgeItems,
  scenarios,
  sessionHistory,
  sessionKnowledgePointOccurrences,
} from "@english-coach/database/schema";
import { and, count, desc, eq, isNull, like, or } from "drizzle-orm";
import type { BackendApp } from "../../http/context";
import { getAuthenticatedUser, parseJsonBody } from "../../http/context";
import { createPageResponse, getPageOffset, normalizePageQuery } from "../../http/pagination";
import { buildApprovedKnowledgeItemValues } from "../../lib/knowledge-occurrence-review";
import { knowledgeOccurrenceEnrichQueue } from "../../lib/queues/knowledge-occurrence.resolve";

class OccurrenceReviewError extends Error {
  constructor(
    readonly code: "not_found" | "already_reviewed",
    message: string,
  ) {
    super(message);
  }
}

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
          proposedCommunicativeFunction: sessionKnowledgePointOccurrences.proposedCommunicativeFunction,
          proposedFixednessLevel: sessionKnowledgePointOccurrences.proposedFixednessLevel,
          proposedPattern: sessionKnowledgePointOccurrences.proposedPattern,
          proposedPatternType: sessionKnowledgePointOccurrences.proposedPatternType,
          proposedSenses: sessionKnowledgePointOccurrences.proposedSenses,
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
            proposedCommunicativeFunction: row.proposedCommunicativeFunction,
            proposedFixednessLevel: row.proposedFixednessLevel,
            proposedPattern: row.proposedPattern,
            proposedPatternType: row.proposedPatternType,
            proposedSenses: row.proposedSenses,
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

  // Approve a complete candidate draft and atomically create or reuse a formal knowledge item.
  app.post("/api/admin/knowledge-occurrences/:id/approve", async (context) => {
    const parsedBody = await parseJsonBody(context, adminApproveKnowledgeOccurrenceSchema);

    if (!parsedBody.success) {
      return parsedBody.response;
    }

    const currentUser = getAuthenticatedUser(context);
    const occurrenceId = context.req.param("id");

    try {
      const result = await db.transaction(async (transaction) => {
        const [occurrence] = await transaction
          .select()
          .from(sessionKnowledgePointOccurrences)
          .where(eq(sessionKnowledgePointOccurrences.id, occurrenceId))
          .limit(1);

        if (!occurrence) {
          throw new OccurrenceReviewError("not_found", "Knowledge occurrence not found");
        }

        if (occurrence.status === "approved" && occurrence.knowledgeItemId) {
          return { created: false, knowledgeItemId: occurrence.knowledgeItemId };
        }

        if (occurrence.status !== "proposed" || occurrence.knowledgeItemId) {
          throw new OccurrenceReviewError("already_reviewed", "Knowledge occurrence has already been reviewed");
        }

        const now = new Date().toISOString();
        const proposedKnowledgeItemId = crypto.randomUUID();
        const insertedItems = await transaction
          .insert(knowledgeItems)
          .values(buildApprovedKnowledgeItemValues(parsedBody.data, { id: proposedKnowledgeItemId, now }))
          .onConflictDoNothing({ target: knowledgeItems.pattern })
          .returning({ id: knowledgeItems.id });
        const created = insertedItems.length > 0;
        const [knowledgeItem] = await transaction
          .select()
          .from(knowledgeItems)
          .where(eq(knowledgeItems.pattern, parsedBody.data.pattern))
          .limit(1);

        if (!knowledgeItem) {
          throw new Error("Approved knowledge item could not be created or resolved");
        }

        if (!created && knowledgeItem.isPendingReview) {
          await transaction
            .update(knowledgeItems)
            .set({
              communicativeFunction: parsedBody.data.communicativeFunction,
              fixednessLevel: parsedBody.data.fixednessLevel,
              isPendingReview: false,
              patternType: parsedBody.data.patternType,
              senses: parsedBody.data.senses,
              updatedAt: now,
            })
            .where(eq(knowledgeItems.id, knowledgeItem.id));
        }

        const reviewedOccurrences = await transaction
          .update(sessionKnowledgePointOccurrences)
          .set({
            knowledgeItemId: knowledgeItem.id,
            rejectionReason: null,
            reviewedAt: now,
            reviewedByUserId: currentUser?.id ?? null,
            status: "approved",
          })
          .where(
            and(
              eq(sessionKnowledgePointOccurrences.id, occurrenceId),
              eq(sessionKnowledgePointOccurrences.status, "proposed"),
              isNull(sessionKnowledgePointOccurrences.knowledgeItemId),
            ),
          )
          .returning({ id: sessionKnowledgePointOccurrences.id });

        if (reviewedOccurrences.length === 0) {
          throw new OccurrenceReviewError("already_reviewed", "Knowledge occurrence was reviewed concurrently");
        }

        return { created, knowledgeItemId: knowledgeItem.id };
      });

      return context.json(
        adminApproveKnowledgeOccurrenceResponseSchema.parse({
          ...result,
          id: occurrenceId,
          status: "approved",
        }),
      );
    } catch (error) {
      if (error instanceof OccurrenceReviewError) {
        return context.json({ error: error.message }, error.code === "not_found" ? 404 : 409);
      }

      throw error;
    }
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

    if (
      existingOccurrence.status === "approved" &&
      existingOccurrence.knowledgeItemId === parsedBody.data.knowledgeItemId
    ) {
      return context.json(
        adminLinkKnowledgeOccurrenceResponseSchema.parse({
          id: occurrenceId,
          knowledgeItemId: existingOccurrence.knowledgeItemId,
          status: "approved",
        }),
      );
    }

    if (existingOccurrence.status !== "proposed" || existingOccurrence.knowledgeItemId) {
      return context.json({ error: "Knowledge occurrence has already been reviewed" }, 409);
    }

    const [existingKnowledgeItem] = await db
      .select({ id: knowledgeItems.id, isPendingReview: knowledgeItems.isPendingReview })
      .from(knowledgeItems)
      .where(eq(knowledgeItems.id, parsedBody.data.knowledgeItemId))
      .limit(1);

    if (!existingKnowledgeItem) {
      return context.json({ error: "Knowledge item not found" }, 404);
    }

    const linked = await db.transaction(async (transaction) => {
      const linkedOccurrences = await transaction
        .update(sessionKnowledgePointOccurrences)
        .set({
          knowledgeItemId: existingKnowledgeItem.id,
          rejectionReason: null,
          reviewedAt: new Date().toISOString(),
          reviewedByUserId: currentUser?.id ?? null,
          status: "approved",
        })
        .where(
          and(
            eq(sessionKnowledgePointOccurrences.id, occurrenceId),
            eq(sessionKnowledgePointOccurrences.status, "proposed"),
            isNull(sessionKnowledgePointOccurrences.knowledgeItemId),
          ),
        )
        .returning({ id: sessionKnowledgePointOccurrences.id });

      if (linkedOccurrences.length === 0) {
        return false;
      }

      if (existingKnowledgeItem.isPendingReview) {
        await transaction
          .update(knowledgeItems)
          .set({ isPendingReview: false, updatedAt: new Date().toISOString() })
          .where(eq(knowledgeItems.id, existingKnowledgeItem.id));
      }

      return true;
    });

    if (!linked) {
      return context.json({ error: "Knowledge occurrence was reviewed concurrently" }, 409);
    }

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
      .select({ id: sessionKnowledgePointOccurrences.id, status: sessionKnowledgePointOccurrences.status })
      .from(sessionKnowledgePointOccurrences)
      .where(eq(sessionKnowledgePointOccurrences.id, occurrenceId))
      .limit(1);

    if (!existingOccurrence) {
      return context.json({ error: "Knowledge occurrence not found" }, 404);
    }

    if (existingOccurrence.status === "rejected") {
      return context.json(adminRejectKnowledgeOccurrenceResponseSchema.parse({ id: occurrenceId, status: "rejected" }));
    }

    if (existingOccurrence.status !== "proposed") {
      return context.json({ error: "Knowledge occurrence has already been reviewed" }, 409);
    }

    const rejectedOccurrences = await db
      .update(sessionKnowledgePointOccurrences)
      .set({
        rejectionReason: parsedBody.data.reason ?? null,
        reviewedAt: new Date().toISOString(),
        reviewedByUserId: currentUser?.id ?? null,
        status: "rejected",
      })
      .where(
        and(
          eq(sessionKnowledgePointOccurrences.id, occurrenceId),
          eq(sessionKnowledgePointOccurrences.status, "proposed"),
          isNull(sessionKnowledgePointOccurrences.knowledgeItemId),
        ),
      )
      .returning({ id: sessionKnowledgePointOccurrences.id });

    if (rejectedOccurrences.length === 0) {
      return context.json({ error: "Knowledge occurrence was reviewed concurrently" }, 409);
    }

    return context.json(
      adminRejectKnowledgeOccurrenceResponseSchema.parse({
        id: occurrenceId,
        status: "rejected",
      }),
    );
  });

  // Queue AI-assisted draft enrichment for a knowledge occurrence.
  app.post("/api/admin/knowledge-occurrences/resolve", async (context) => {
    const parsedBody = await parseJsonBody(context, resolveKnowledgeOccurrenceSchema);

    if (!parsedBody.success) {
      return parsedBody.response;
    }

    const job = await knowledgeOccurrenceEnrichQueue.add(
      knowledgeOccurrenceEnrichJobName,
      { occurrenceId: parsedBody.data.occurrenceId },
      {
        jobId: `${knowledgeOccurrenceEnrichJobName}-${parsedBody.data.occurrenceId}`,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return context.json({ jobId: String(job.id), occurrenceId: parsedBody.data.occurrenceId }, 202);
  });
}
