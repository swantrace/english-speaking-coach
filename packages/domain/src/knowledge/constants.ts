export const patternTypeValues = [
  "lexical_verb_noun",
  "lexical_adjective_noun",
  "lexical_noun_verb",
  "lexical_noun_of_noun",
  "lexical_adverb_adjective",
  "lexical_verb_particle",
  "grammatical_preposition_noun",
  "grammatical_preposition_noun_preposition",
  "grammatical_adjective_preposition",
  "grammatical_adjective_to_infinitive",
  "grammatical_adjective_that_clause",
  "grammatical_verb_preposition",
  "grammatical_verb_to_infinitive",
  "grammatical_verb_that_clause",
  "grammatical_verb_noun_preposition",
  "grammatical_verb_particle_preposition",
  "grammatical_noun_preposition",
  "grammatical_noun_to_infinitive",
  "grammatical_noun_that_clause",
  "grammatical_conjunction_phrase",
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

export type PatternType = (typeof patternTypeValues)[number];
export type FixednessLevel = (typeof fixednessLevelValues)[number];
export type CommunicativeFunction = (typeof communicativeFunctionValues)[number];
export type KnowledgeOccurrenceStatus = (typeof knowledgeOccurrenceStatusValues)[number];
