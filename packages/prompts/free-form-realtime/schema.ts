export type BuildFreeFormRealtimeInstructionsParams = {
	learnerLevel?: "A2" | "B1" | "B2" | "C1";
	analysis?: {
		summary: string;
		corrections: {
			original: string;
			correction: string;
			explanation: string;
		}[];
		newlyDiscoveredKps: { phrase: string; explanation: string }[];
		patternIssues: string[];
	};
	functionalScenario?: {
		title: string;
		description: string;
		tags: string[];
		examplePhrases: { phrase: string; explanation: string }[];
	};
};
