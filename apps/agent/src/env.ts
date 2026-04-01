import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

export type AgentModelProvider = "livekit" | "plugins";

const envFilePath = fileURLToPath(new URL("../.env.local", import.meta.url));

export function loadAgentEnv() {
  dotenv.config({ path: envFilePath, quiet: true });
}

export function getAgentEnvFilePath() {
  return envFilePath;
}

export function getRequiredEnv(name: string, env: NodeJS.ProcessEnv = process.env) {
  const value = env[name]?.trim();

  if (value) {
    return value;
  }

  throw new Error(`Missing required environment variable: ${name}`);
}

export function resolveAgentModelProvider(env: NodeJS.ProcessEnv = process.env): AgentModelProvider {
  const configuredProvider = env.AGENT_MODEL_PROVIDER?.trim().toLowerCase();

  if (configuredProvider === "livekit" || configuredProvider === "plugins") {
    return configuredProvider;
  }

  const liveKitUrl = env.LIVEKIT_URL?.toLowerCase() ?? "";

  return liveKitUrl.includes(".livekit.cloud") ? "livekit" : "plugins";
}

export function validateAgentEnvironment(env: NodeJS.ProcessEnv = process.env) {
  const provider = resolveAgentModelProvider(env);

  if (provider === "livekit") {
    return;
  }

  const missingVariables = ["OPENAI_API_KEY"].filter((name) => !env[name]?.trim());

  if (missingVariables.length === 0) {
    return;
  }

  throw new Error(
    `AGENT_MODEL_PROVIDER=plugins requires the following environment variables: ${missingVariables.join(", ")}`,
  );
}
