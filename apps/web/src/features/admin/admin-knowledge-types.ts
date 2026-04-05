import {
  adminKnowledgeItemCreateSchema,
  type KnowledgeItem,
  type KnowledgeItemReviewStatus,
  type KnowledgeItemSource,
} from "@english-coach/contract";

export type KnowledgeItemFormDraft = {
  communicativeFunction: KnowledgeItem["communicativeFunction"];
  example: string;
  fixednessLevel: KnowledgeItem["fixednessLevel"];
  pattern: string;
  reviewStatus: KnowledgeItemReviewStatus;
  syntaxRole: KnowledgeItem["syntaxRole"];
};

export function createEmptyKnowledgeItemDraft(): KnowledgeItemFormDraft {
  return {
    communicativeFunction: null,
    example: "",
    fixednessLevel: null,
    pattern: "",
    reviewStatus: "approved",
    syntaxRole: null,
  };
}

export function createDraftFromKnowledgeItem(item: KnowledgeItem): KnowledgeItemFormDraft {
  return {
    communicativeFunction: item.communicativeFunction,
    example: item.example ?? "",
    fixednessLevel: item.fixednessLevel,
    pattern: item.pattern,
    reviewStatus: item.reviewStatus,
    syntaxRole: item.syntaxRole,
  };
}

export function parseKnowledgeItemDraft(draft: KnowledgeItemFormDraft) {
  const parsedDraft = adminKnowledgeItemCreateSchema.safeParse({
    communicativeFunction: draft.communicativeFunction,
    example: draft.example.trim() || null,
    fixednessLevel: draft.fixednessLevel,
    pattern: draft.pattern,
    reviewStatus: draft.reviewStatus,
    syntaxRole: draft.syntaxRole,
  });

  if (!parsedDraft.success) {
    throw new Error(parsedDraft.error.issues[0]?.message ?? "Knowledge item form is invalid.");
  }

  return parsedDraft.data;
}

export function getReviewBadgeClassName(reviewStatus: KnowledgeItemReviewStatus) {
  if (reviewStatus === "approved") {
    return "border-emerald-300 bg-emerald-100 text-emerald-900";
  }

  if (reviewStatus === "rejected") {
    return "border-rose-300 bg-rose-100 text-rose-900";
  }

  return "border-amber-300 bg-amber-100 text-amber-900";
}

export function getSourceBadgeClassName(source: KnowledgeItemSource) {
  if (source === "admin") {
    return "border-cyan-300 bg-cyan-100 text-cyan-900";
  }

  return "border-violet-300 bg-violet-100 text-violet-900";
}
