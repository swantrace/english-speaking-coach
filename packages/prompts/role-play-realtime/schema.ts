import type { SessionTargetKp } from "../../db/schema";

/**
 * Params for building the role-play realtime instructions.
 *
 * NOTE:
 * - `scenario` only contains static metadata (title, description).
 * - `session` contains roles, initial goals/KPs, and remaining goals/KPs.
 *   This matches what the client sends from `useRolePlayChat`.
 */
export type BuildRolePlayRealtimeInstructionsParams = {
	scenario: {
		title: string;
		description: string;
	};
	session: {
		assistantRole: string;
		userRole: string;
		initialGoals: string[];
		initialTargetKps: SessionTargetKp[];
		remainingGoals?: string[];
		remainingTargetKps?: SessionTargetKp[];
	};
};

/**
 * Tool definition for progress tracking in role-play realtime sessions.
 * Used by the OpenAI Realtime API to analyze messages and track learner progress.
 */
export const ANALYZE_LATEST_MESSAGES_TOOL = {
	type: "function",
	name: "analyzeLatestMessages",
	description: "Analyze the latest messages for progress tracking.",
	parameters: {
		type: "object",
		properties: {
			newlyCompletedGoals: {
				type: "array",
				items: { type: "string" },
				description: "List of scenario goals that were fully achieved.",
			},
			newlyUsedTargetKps: {
				type: "array",
				items: {
					type: "object",
					properties: {
						id: { type: "string" },
						phrase: { type: "string" },
					},
					required: ["id", "phrase"],
				},
				description: "List of target knowledge points used.",
			},
		},
		required: ["newlyCompletedGoals", "newlyUsedTargetKps"],
	},
} as const;
