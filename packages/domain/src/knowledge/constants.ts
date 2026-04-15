export const syntaxRoleValues = [
  "predicate_verb",
  "predicate_adjective",
  "adverbial_modifier",
  "noun_phrase",
  "discourse_linker",
  "clause_pattern",
] as const;
export const fixednessLevelValues = ["restricted_collocation", "fixed_expression", "idiom"] as const;
export const communicativeFunctionValues = [
  "manage_social_relation",
  "express_attitude_or_opinion",
  "make_request_or_offer",
  "give_or_seek_information",
  "organize_discourse",
  "react_in_conversation",
  "express_degree_or_soften",
  "express_time_or_sequence",
] as const;
export const knowledgeOccurrenceStatusValues = ["proposed", "approved", "rejected"] as const;

export type SyntaxRole = (typeof syntaxRoleValues)[number];
export type FixednessLevel = (typeof fixednessLevelValues)[number];
export type CommunicativeFunction = (typeof communicativeFunctionValues)[number];
export type KnowledgeOccurrenceStatus = (typeof knowledgeOccurrenceStatusValues)[number];
