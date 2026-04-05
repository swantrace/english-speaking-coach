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
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  }

  if (reviewStatus === "rejected") {
    return "border-rose-400/30 bg-rose-400/10 text-rose-100";
  }

  return "border-amber-400/30 bg-amber-400/10 text-amber-100";
}

export function getSourceBadgeClassName(source: KnowledgeItemSource) {
  if (source === "admin") {
    return "border-cyan-400/30 bg-cyan-400/10 text-cyan-100";
  }

  return "border-violet-400/30 bg-violet-400/10 text-violet-100";
}