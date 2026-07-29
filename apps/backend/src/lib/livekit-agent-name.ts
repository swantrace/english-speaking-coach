export const defaultLiveKitAgentName = "english-speaking-coach-agent";

export function getLiveKitAgentName(env: NodeJS.ProcessEnv = process.env) {
  return env.LIVEKIT_AGENT_NAME?.trim() || defaultLiveKitAgentName;
}
