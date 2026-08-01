import { db } from "@english-coach/database";
import { sessionKnowledgePointOccurrences } from "@english-coach/database/schema";
import { and, eq, isNull, or } from "drizzle-orm";

/** Find only unresolved, unreviewed occurrences whose candidate draft is incomplete. */
export async function findKnowledgeOccurrenceEnrichmentBackfillIds() {
  const occurrences = await db
    .select({ id: sessionKnowledgePointOccurrences.id })
    .from(sessionKnowledgePointOccurrences)
    .where(
      and(
        eq(sessionKnowledgePointOccurrences.status, "proposed"),
        isNull(sessionKnowledgePointOccurrences.knowledgeItemId),
        or(
          isNull(sessionKnowledgePointOccurrences.proposedPatternType),
          isNull(sessionKnowledgePointOccurrences.proposedSenses),
        ),
      ),
    );

  return occurrences.map(({ id }) => id);
}
