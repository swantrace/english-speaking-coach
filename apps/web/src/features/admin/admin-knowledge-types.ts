import { adminKnowledgeItemCreateSchema, type KnowledgeItem } from "@english-coach/contract";

export type KnowledgeItemFormDraft = {
  communicativeFunction: KnowledgeItem["communicativeFunction"];
  fixednessLevel: KnowledgeItem["fixednessLevel"];
  pattern: string;
  syntaxRole: KnowledgeItem["syntaxRole"];
};

export function createEmptyKnowledgeItemDraft(): KnowledgeItemFormDraft {
  return {
    communicativeFunction: null,
    fixednessLevel: null,
    pattern: "",
    syntaxRole: null,
  };
}

export function createDraftFromKnowledgeItem(item: KnowledgeItem): KnowledgeItemFormDraft {
  return {
    communicativeFunction: item.communicativeFunction,
    fixednessLevel: item.fixednessLevel,
    pattern: item.pattern,
    syntaxRole: item.syntaxRole,
  };
}

export function parseKnowledgeItemDraft(draft: KnowledgeItemFormDraft) {
  const parsedDraft = adminKnowledgeItemCreateSchema.safeParse({
    communicativeFunction: draft.communicativeFunction,
    fixednessLevel: draft.fixednessLevel,
    pattern: draft.pattern,
    syntaxRole: draft.syntaxRole,
  });

  if (!parsedDraft.success) {
    throw new Error(parsedDraft.error.issues[0]?.message ?? "Knowledge item form is invalid.");
  }

  return parsedDraft.data;
}
