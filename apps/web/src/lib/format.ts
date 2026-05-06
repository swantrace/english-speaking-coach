import type { CommunicativeFunction, FixednessLevel, PatternType, SessionType } from "@english-coach/domain";

export function formatSessionType(sessionType: SessionType) {
  return sessionType === "role-play" ? "Role-play" : "Free-form";
}

const patternTypeLabels: Record<PatternType, string> = {
  grammatical_adjective_preposition: "Adj + prep",
  grammatical_adjective_that_clause: "Adj + that-clause",
  grammatical_adjective_to_infinitive: "Adj + to-inf",
  grammatical_conjunction_phrase: "Conjunction phrase",
  grammatical_noun_preposition: "N + prep",
  grammatical_noun_that_clause: "N + that-clause",
  grammatical_noun_to_infinitive: "N + to-inf",
  grammatical_preposition_noun: "Prep + N",
  grammatical_preposition_noun_preposition: "Prep + N + prep",
  grammatical_verb_noun_preposition: "V + N + prep",
  grammatical_verb_particle_preposition: "V + particle + prep",
  grammatical_verb_preposition: "V + prep",
  grammatical_verb_that_clause: "V + that-clause",
  grammatical_verb_to_infinitive: "V + to-inf",
  lexical_adjective_noun: "Adj + N",
  lexical_adverb_adjective: "Adv + adj",
  lexical_noun_of_noun: "N + of + N",
  lexical_noun_verb: "N + V",
  lexical_verb_noun: "V + N",
  lexical_verb_particle: "V + particle",
};

const fixednessLevelLabels: Record<FixednessLevel, string> = {
  fixed_expression: "Fixed expression",
  idiom: "Idiom",
  restricted_collocation: "Restricted collocation",
};

const communicativeFunctionLabels: Record<CommunicativeFunction, string> = {
  express_attitude_or_opinion: "Express attitude or opinion",
  express_degree_or_soften: "Express degree or soften",
  express_time_or_sequence: "Express time or sequence",
  give_or_seek_information: "Give or seek information",
  make_request_or_offer: "Make request or offer",
  manage_social_relation: "Manage social relation",
  organize_discourse: "Organize discourse",
  react_in_conversation: "React in conversation",
};

export function formatPatternType(patternType: PatternType) {
  return patternTypeLabels[patternType];
}

export function formatFixednessLevel(fixednessLevel: FixednessLevel) {
  return fixednessLevelLabels[fixednessLevel];
}

export function formatCommunicativeFunction(communicativeFunction: CommunicativeFunction) {
  return communicativeFunctionLabels[communicativeFunction];
}

export function formatDurationSeconds(durationSeconds: number | null) {
  if (durationSeconds === null) {
    return "Unavailable";
  }

  if (durationSeconds < 60) {
    return `${durationSeconds}s`;
  }

  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  if (minutes > 0 && seconds === 0) {
    return `${minutes} min`;
  }

  return `${minutes}m ${seconds}s`;
}

export function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}
