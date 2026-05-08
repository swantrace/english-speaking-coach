import { communicativeFunctions, fixednessLevels, patternTypes } from "@english-coach/contract/common";
import { db } from "@english-coach/database";
import { knowledgeItems } from "@english-coach/database/schema";
import { eq } from "drizzle-orm";
import type { GeneratedKnowledgeItem } from "../../ai";

export type PersistedKnowledgeItem = {
  knowledgeItemId: string;
  pattern: string;
  processedAt: string;
};

type KnowledgeItemValues = typeof knowledgeItems.$inferInsert;

function isPatternTypeConstraintError(error: unknown) {
  return error instanceof Error && error.message.includes("knowledge_items_pattern_type_check");
}

function normalizeEnumValue<TValue extends string>(value: unknown, allowedValues: readonly TValue[]): TValue | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return allowedValues.find((allowedValue) => allowedValue === normalized) ?? null;
}

export async function persistGeneratedKnowledgeItem(
  generatedKnowledgeItem: GeneratedKnowledgeItem,
): Promise<PersistedKnowledgeItem> {
  const now = new Date().toISOString();
  const communicativeFunction = normalizeEnumValue(
    generatedKnowledgeItem.communicativeFunction,
    communicativeFunctions,
  );
  const fixednessLevel = normalizeEnumValue(generatedKnowledgeItem.fixednessLevel, fixednessLevels);
  const patternType = normalizeEnumValue(generatedKnowledgeItem.patternType, patternTypes);
  const [existing] = await db
    .select()
    .from(knowledgeItems)
    .where(eq(knowledgeItems.pattern, generatedKnowledgeItem.pattern))
    .limit(1);

  if (existing) {
    if (existing.isPendingReview) {
      const updateValues = {
        communicativeFunction,
        fixednessLevel,
        senses: generatedKnowledgeItem.senses,
        patternType,
        updatedAt: now,
      } satisfies Partial<KnowledgeItemValues>;

      try {
        await db.update(knowledgeItems).set(updateValues).where(eq(knowledgeItems.id, existing.id));
      } catch (error) {
        if (!isPatternTypeConstraintError(error)) {
          throw error;
        }

        await db
          .update(knowledgeItems)
          .set({
            ...updateValues,
            patternType: null,
          })
          .where(eq(knowledgeItems.id, existing.id));
      }
    }

    return {
      knowledgeItemId: existing.id,
      pattern: generatedKnowledgeItem.pattern,
      processedAt: now,
    };
  }

  const knowledgeItemId = crypto.randomUUID();
  const insertValues = {
    communicativeFunction,
    createdAt: now,
    fixednessLevel,
    id: knowledgeItemId,
    isPendingReview: true,
    pattern: generatedKnowledgeItem.pattern,
    senses: generatedKnowledgeItem.senses,
    patternType,
    updatedAt: now,
  } satisfies KnowledgeItemValues;

  try {
    await db.insert(knowledgeItems).values(insertValues);
  } catch (error) {
    if (!isPatternTypeConstraintError(error)) {
      throw error;
    }

    await db.insert(knowledgeItems).values({
      ...insertValues,
      patternType: null,
    });
  }

  return {
    knowledgeItemId,
    pattern: generatedKnowledgeItem.pattern,
    processedAt: now,
  };
}
