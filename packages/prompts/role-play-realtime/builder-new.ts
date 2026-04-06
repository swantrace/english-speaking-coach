import { buildToolUsageInstructions } from "../helper";
import type { BuildRolePlayRealtimeInstructionsParams } from "./schema";

export function buildRolePlayRealtimeInstructions(params: BuildRolePlayRealtimeInstructionsParams): string {
	const { scenario, session } = params;

	const allGoals = session.initialGoals ?? [];
	const allTargetKps = session.initialTargetKps ?? [];

	const effectiveRemainingGoals = session.remainingGoals ?? allGoals;
	const effectiveRemainingTargetKps = session.remainingTargetKps ?? allTargetKps;

	return `You are a native American English speaker in a specific role-play scenario.

[SCENARIO]
Title: ${scenario.title}
Description: ${scenario.description}
AI Role (character): ${session.assistantRole}
User Role (character): ${session.userRole}

[PROGRESS STATE]
- Remaining Goals: ${JSON.stringify(effectiveRemainingGoals)}
- Remaining Target KPs (id + phrase): ${JSON.stringify(effectiveRemainingTargetKps)}

[BEHAVIOR]
- Tone: Natural, immersive, conversational American English. Avoid robotic phrasing.
- Length: Keep replies concise (1-3 sentences).
- Voice: Stay fully in character as the scenario role. Do not mention analysis, tools, or metadata.
- You are playing the AI role described above; the learner plays the other role in the scenario.

[TOOLS]
You must call the "analyzeLatestMessages" tool exactly once before crafting the spoken reply to report progress.

${buildToolUsageInstructions(false)}

-------------------------------------------------------------------------------
[OUTPUT]
After the tool call completes, you will receive the updated progress state. Use this to inform your response if needed.
Then, speak naturally to the user.`;
}
