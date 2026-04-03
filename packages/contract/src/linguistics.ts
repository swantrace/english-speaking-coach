/**
 * Single source of truth for all linguistic taxonomy enums.
 * Database CHECK constraints and Zod schemas both import from here.
 *
 * ── Vocabulary placeholders used in knowledge item `pattern` strings ──────────
 *
 * <sb>       – subject (human referent)
 * <sth>      – something (non-human object)
 * <np>       – noun phrase
 * <clause>   – full clause
 * <to_v>     – to-infinitive verb phrase  (e.g. "to go")
 * <v_ing>    – present participle / gerund (e.g. "going")
 * <adj>      – adjective
 * <adv>      – adverb
 * <num>      – number
 * <time>     – time expression
 * <place>    – place expression
 *
 * Alternation: <np|clause>, <sb|np> — either slot type is acceptable.
 *
 * These conventions are enforced by the LLM prompt inside the generation worker;
 * they are NOT validated by runtime code.
 */

export const syntaxRoles = [
  "predicate_verb",
  "predicate_adjective",
  "adverbial_modifier",
  "noun_phrase",
  "discourse_linker",
  "clause_pattern",
] as const;

export const fixednessLevels = ["restricted_collocation", "fixed_expression", "idiom"] as const;

export const communicativeFunctions = [
  "manage_social_relation",
  "express_attitude_or_opinion",
  "make_request_or_offer",
  "give_or_seek_information",
  "organize_discourse",
  "react_in_conversation",
  "express_degree_or_soften",
  "express_time_or_sequence",
] as const;

export const errorDimensions = ["lexical", "syntactic", "pragmatic", "discourse", "phonological"] as const;

export const userRoles = ["student", "admin"] as const;

export type SyntaxRole = (typeof syntaxRoles)[number];
export type FixednessLevel = (typeof fixednessLevels)[number];
export type CommunicativeFunction = (typeof communicativeFunctions)[number];
export type ErrorDimension = (typeof errorDimensions)[number];
export type UserRole = (typeof userRoles)[number];
