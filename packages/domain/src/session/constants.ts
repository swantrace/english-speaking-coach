export const errorDimensionValues = ["lexical", "syntactic", "pragmatic", "discourse", "phonological"] as const;
export const sessionTypeValues = ["role-play", "free-form"] as const;
export const speakerValues = ["user", "assistant"] as const;
export const selectedCharacterIndexValues = [0, 1] as const;

export type SessionType = (typeof sessionTypeValues)[number];
export type Speaker = (typeof speakerValues)[number];
export type ErrorDimension = (typeof errorDimensionValues)[number];
export type SelectedCharacterIndex = (typeof selectedCharacterIndexValues)[number];
