import type { CommunicativeFunction, FixednessLevel, SessionType, SyntaxRole } from "@english-coach/domain";

export function formatSessionType(sessionType: SessionType) {
  return sessionType === "role-play" ? "Role-play" : "Free-form";
}

const syntaxRoleLabels: Record<SyntaxRole, string> = {
  adverbial_modifier: "Adverbial modifier",
  clause_pattern: "Clause pattern",
  discourse_linker: "Discourse linker",
  noun_phrase: "Noun phrase",
  predicate_adjective: "Predicate adjective",
  predicate_verb: "Predicate verb",
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

export function formatSyntaxRole(syntaxRole: SyntaxRole) {
  return syntaxRoleLabels[syntaxRole];
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
