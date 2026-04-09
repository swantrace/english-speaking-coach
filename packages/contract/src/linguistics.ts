import {
  communicativeFunctionValues,
  errorDimensionValues,
  fixednessLevelValues,
  syntaxRoleValues,
  userRoleValues,
} from "@english-coach/database/schema";

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

export const syntaxRoles = syntaxRoleValues;

export const fixednessLevels = fixednessLevelValues;

export const communicativeFunctions = communicativeFunctionValues;

export const errorDimensions = errorDimensionValues;

export const userRoles = userRoleValues;

export type SyntaxRole = (typeof syntaxRoles)[number];
export type FixednessLevel = (typeof fixednessLevels)[number];
export type CommunicativeFunction = (typeof communicativeFunctions)[number];
export type ErrorDimension = (typeof errorDimensions)[number];
export type UserRole = (typeof userRoles)[number];
