// import { z } from "zod";
// import { KNOWLEDGE_POINT_TYPES, type KnowledgeItemType } from "../../db/constants";
// import type { ProviderId } from "../types";

/**
 * Re-export for convenience within the prompts module.
 * SINGLE SOURCE OF TRUTH: @/db/constants
 */
// export const knowledgeItemTypes = KNOWLEDGE_POINT_TYPES;
// export type { KnowledgeItemType };

/**
 * Controlled grammar tag namespace.
 * Extend this list as your grammar feature set grows.
 */
// export const grammarTags = [
//   // CH1 Basic sentence patterns
//   "g:be-verb",
//   "g:linking-verbs",
//   "g:complement",
//   "g:subject-complement",
//   "g:object-complement",
//   "g:double-object",
//   "g:copular-verbs",
//   "g:transitive-verbs",
//   "g:intransitive-verbs",
//   "g:verb-complementation-patterns",
//   "g:verb-patterns-SVC",
//   "g:verb-patterns-SVO",
//   "g:verb-patterns-SVOO",
//   "g:verb-patterns-SVOC",

//   // CH2 Noun phrase & articles
//   "g:noun-phrase-structure",
//   "g:determiner-usage",
//   "g:zero-determiner",
//   "g:article-basic",
//   "g:article-definite",
//   "g:article-indefinite",
//   "g:article-zero",
//   "g:article-with-proper-nouns",
//   "g:proper-noun-as-complement",

//   // CH3 Tense
//   "g:tense-simple-present",
//   "g:tense-simple-past",
//   "g:tense-simple-future",
//   "g:tense-present-perfect",
//   "g:tense-past-perfect",
//   "g:tense-perfect-progressive",
//   "g:aspect-simple",
//   "g:aspect-perfect",

//   // CH4 Infinitives
//   "g:infinitive",
//   "g:bare-infinitive",
//   "g:infinitive-functions",
//   "g:infinitive-vs-gerund",
//   "g:to-infinitive-as-subject",
//   "g:to-infinitive-as-object",
//   "g:infinitive-after-modal",

//   // CH5 Gerunds
//   "g:gerund",
//   "g:gerund-as-subject",
//   "g:gerund-as-object",
//   "g:gerund-after-preposition",
//   "g:gerund-vs-participle",

//   // CH6 Participles
//   "g:participle-present",
//   "g:participle-past",
//   "g:participle-vs-adjective",
//   "g:participle-phrase",
//   "g:reduced-adjective-clause",
//   "g:reduced-adverb-clause",
//   "g:present-participle",
//   "g:past-participle",
//   "g:participial-adjective",
//   "g:participial-reduction",

//   // CH7 Adjectives
//   "g:adjective-order",
//   "g:adjective-in-noun-phrase",
//   "g:adjective-as-complement",
//   "g:adjective-in-complement-position",
//   "g:adjective-comparative",
//   "g:adjective-superlative",

//   // CH8 Adverbs
//   "g:adverb-modifying-verb",
//   "g:adverb-modifying-adjective",
//   "g:adverb-modifying-sentence",
//   "g:intensifier",

//   // CH9 Mood
//   "g:mood-indicative",
//   "g:mood-conditional",
//   "g:mood-subjunctive",
//   "g:mood-hypothetical",
//   "g:mood-imperative",

//   // CH10 Prepositions
//   "g:preposition",
//   "g:preposition-place",
//   "g:preposition-time",
//   "g:preposition-usage",
//   "g:prepositional-phrase",

//   // CH11 Agreement
//   "g:agreement-basic",
//   "g:agreement-compound-subject",
//   "g:agreement-collective-nouns",
//   "g:agreement-singular-vs-plural",
//   "g:agreement-indefinite-pronouns",
//   "g:agreement-with-prepositional-phrase",

//   // CH12 Noun clauses
//   "g:clause-noun",
//   "g:clause-that",
//   "g:clause-if-whether",
//   "g:embedded-question",
//   "g:noun-clause-as-subject",
//   "g:noun-clause-as-object",

//   // CH13 Adverb clauses
//   "g:clause-adverb",
//   "g:adverb-clause-time",
//   "g:adverb-clause-reason",
//   "g:adverb-clause-result",
//   "g:adverb-clause-condition",
//   "g:adverb-clause-contrast",

//   // CH14 Relative clauses
//   "g:clause-relative",
//   "g:relative-pronoun-who",
//   "g:relative-pronoun-which",
//   "g:relative-pronoun-that",
//   "g:relative-adverb-where",
//   "g:omitted-relative-pronoun",
//   "g:position-of-relative-clause",
//   "g:relative-clause-restriction",
//   "g:relative-clause-non-restrictive",

//   // CH15 Coordination
//   "g:coordination",
//   "g:coordinating-conjunctions",
//   "g:parallel-structure",

//   // CH16–21 Clause reduction
//   "g:reduction-general",
//   "g:reduction-relative",
//   "g:reduction-adverbial",
//   "g:reduction-to-infinitive",
//   "g:reduction-ving",
//   "g:reduction-prepositional-phrase",

//   // CH22 Inversion
//   "g:inversion-conditional",
//   "g:inversion-negative-adverbial",
//   "g:inversion-comparative",
//   "g:inversion-quotes",
//   "g:inversion-there-is",
// ] as const;

// export type GrammarTag = (typeof grammarTags)[number];
/**
 * Controlled functional tag namespace.
 * Extend this list as your functional use case set grows.
 */
// export const functionalTags = [
//   // A. Small talk & social interaction
//   "f:small_talk",
//   "f:introductions",
//   "f:break_the_ice",
//   "f:talk_about_self",
//   "f:express_interest",
//   "f:stay_in_touch",
//   "f:end_conversation",
//   "f:compliments",

//   // B. Past experiences, storytelling, narratives
//   "f:share_past_experience",
//   "f:narrate_story",
//   "f:express_emotions",
//   "f:connect_events",
//   "f:sequence_events",
//   "f:retell_conversation",

//   // C. Likes, dislikes, interests, preferences
//   "f:express_likes",
//   "f:express_dislikes",
//   "f:express_preferences",
//   "f:express_interests",
//   "f:make_offers",
//   "f:invite_someone",
//   "f:express_indifference",

//   // D. Describing objects & processes
//   "f:describe_objects",
//   "f:describe_features",
//   "f:describe_cost",
//   "f:compare_items",
//   "f:contrast_items",
//   "f:give_instructions",

//   // E. Problems, advice, complaints
//   "f:state_problem",
//   "f:ask_for_help",
//   "f:give_advice",
//   "f:express_sympathy",
//   "f:express_gratitude",
//   "f:make_complaint",
//   "f:reassure",

//   // F. Decision making, planning, scheduling
//   "f:discuss_options",
//   "f:state_reasons",
//   "f:pros_and_cons",
//   "f:make_decision",
//   "f:express_indecision",
//   "f:set_schedule",
//   "f:discuss_goals",
//   "f:encourage",

//   // G. Opinions, discussions, debates
//   "f:ask_for_opinion",
//   "f:state_opinion",
//   "f:agree",
//   "f:disagree",
//   "f:support_argument",
//   "f:recommend_solution",
//   "f:use_statistics",

//   // H. Group discussions / meetings
//   "f:lead_discussion",
//   "f:participate_meeting",
//   "f:interrupt_politely",
//   "f:clarify_information",
//   "f:resolve_misunderstanding",
//   "f:conclude_meeting",

//   // I. Serious topics, negotiation
//   "f:negotiate",
//   "f:complain_strongly",
//   "f:set_rules",
//   "f:deliver_bad_news",
//   "f:express_certainty",
//   "f:express_probability",
//   "f:apologize",

//   // J. Social occasions
//   "f:celebrate_event",
//   "f:give_congratulations",
//   "f:give_thanks",
//   "f:make_toast",
//   "f:talk_about_vacation",

//   // K. Telephone skills
//   "f:make_call",
//   "f:receive_call",
//   "f:leave_message",
//   "f:take_message",
//   "f:check_information",
//   "f:book_reservation",
//   "f:cancel_booking",
//   "f:request_service",

//   // L. Core conversational functions (additional)
//   "f:express_wants",
//   "f:express_needs",
//   "f:make_requests",
//   "f:express_uncertainty",
//   "f:discuss_future_events",
//   "f:persist_in_argument",
// ] as const;

// export type FunctionalTag = (typeof functionalTags)[number];

// Any tag is allowed, but if it starts with "g:" it must be in grammarTags.
// const TagSchema = z
//   .string()
//   .refine(
//     (tag) => !tag.startsWith("g:") || (grammarTags as readonly string[]).includes(tag as GrammarTag),
//     "Invalid grammar tag (g:...)",
//   )
//   .refine(
//     (tag) => !tag.startsWith("f:") || (functionalTags as readonly string[]).includes(tag as FunctionalTag),
//     "Invalid functional tag (f:...)",
//   );

/**
 * Generator output schema for one knowledge point.
 * This is what the model must return.
 */
// export const KnowledgeItemGenerateSchema = z.object({
//   // canonical phrase / label
//   phrase: z.string(),

//   // short learner-friendly explanation
//   explanation: z.string(),

//   // one representative example sentence
//   example: z.string(),

//   // KP type aligned with DB enum
//   type: z.enum(knowledgeItemTypes),

//   /**
//    * Tags follow the unified system:
//    *  - "g:..."  grammar features   e.g. "g:tense-present-perfect"
//    *  - "f:..."  functional uses    e.g. "f:polite_request"
//    *  - "t:..."  topics / co
//    *  - "lvl:..." levels            e.g. "lvl:B1"
//    *
//    * Constraint: if a tag starts with "g:", it must be in grammarTags.
//    */
//   tags: z.array(TagSchema).default([]),
// });

// export type KnowledgeItemGenerateResult = z.infer<typeof KnowledgeItemGenerateSchema>;

// export type BuildKnowledgeItemGeneratePromptParams = {
//   provider: ProviderId;
//   draftPhrase: string;
//   draftExplanation?: string;
// };
