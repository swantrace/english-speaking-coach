import { db } from "@english-coach/database";
import { knowledgeItems } from "@english-coach/database/schema";
import { eq } from "drizzle-orm";
import type { GeneratedKnowledgeItem } from "../../ai";

export type PersistedKnowledgeItem = {
  knowledgeItemId: string;
  pattern: string;
  processedAt: string;
};

export async function persistGeneratedKnowledgeItem(
  generatedKnowledgeItem: GeneratedKnowledgeItem,
): Promise<PersistedKnowledgeItem> {
  const now = new Date().toISOString();
  const [existing] = await db
    .select()
    .from(knowledgeItems)
    .where(eq(knowledgeItems.pattern, generatedKnowledgeItem.pattern))
    .limit(1);

  if (existing) {
    if (existing.isPendingReview) {
      await db
        .update(knowledgeItems)
        .set({
          communicativeFunction: generatedKnowledgeItem.communicativeFunction ?? null,
          fixednessLevel: generatedKnowledgeItem.fixednessLevel ?? null,
          syntaxRole: generatedKnowledgeItem.syntaxRole ?? null,
          updatedAt: now,
        })
        .where(eq(knowledgeItems.id, existing.id));
    }

    return {
      knowledgeItemId: existing.id,
      pattern: generatedKnowledgeItem.pattern,
      processedAt: now,
    };
  }

  const knowledgeItemId = crypto.randomUUID();

  await db.insert(knowledgeItems).values({
    communicativeFunction: generatedKnowledgeItem.communicativeFunction ?? null,
    createdAt: now,
    fixednessLevel: generatedKnowledgeItem.fixednessLevel ?? null,
    id: knowledgeItemId,
    isPendingReview: true,
    pattern: generatedKnowledgeItem.pattern,
    senses: [],
    syntaxRole: generatedKnowledgeItem.syntaxRole ?? null,
    updatedAt: now,
  });

  return {
    knowledgeItemId,
    pattern: generatedKnowledgeItem.pattern,
    processedAt: now,
  };
}
