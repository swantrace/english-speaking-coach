import { resolve } from "node:path";
import dotenv from "dotenv";

export type AgentModelProvider = "livekit" | "plugins";

const envFilePath = resolve(process.cwd(), ".env.local");

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

export function shouldValidateAgentEnvironment(argv: string[] = process.argv) {
  return !argv.includes("download-files");
}

const defaultDevelopmentApiToken = "english-coach-local-api-token";
export const defaultLiveKitAgentName = "english-speaking-coach-agent";

function isProductionEnvironment(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV?.trim().toLowerCase() === "production";
}

export function getAgentApiToken(env: NodeJS.ProcessEnv = process.env) {
  const configuredToken = env.API_TOKEN?.trim();

  if (configuredToken) {
    return configuredToken;
  }

  if (!isProductionEnvironment(env)) {
    return defaultDevelopmentApiToken;
  }

  return undefined;
}

export function getBackendBaseUrl(env: NodeJS.ProcessEnv = process.env) {
  return (env.BACKEND_BASE_URL ?? env.API_BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");
}

export function getLiveKitAgentName(env: NodeJS.ProcessEnv = process.env) {
  return env.LIVEKIT_AGENT_NAME?.trim() || defaultLiveKitAgentName;
}

export function getRedisConnectionOptions(env: NodeJS.ProcessEnv = process.env) {
  const redisUrl = env.REDIS_URL?.trim();

  if (redisUrl) {
    const parsedUrl = new URL(redisUrl);
    const databaseFromUrl = parsedUrl.pathname.replace(/^\//, "").trim();

    return {
      db: databaseFromUrl ? Number(databaseFromUrl) : Number(env.REDIS_DB ?? 0),
      host: parsedUrl.hostname,
      password: parsedUrl.password || undefined,
      port: parsedUrl.port ? Number(parsedUrl.port) : 6379,
      tls: parsedUrl.protocol === "rediss:" ? {} : undefined,
      username: parsedUrl.username || undefined,
    };
  }

  return {
    db: Number(env.REDIS_DB ?? 0),
    host: env.REDIS_HOST ?? "127.0.0.1",
    password: env.REDIS_PASSWORD,
    port: Number(env.REDIS_PORT ?? 6379),
    username: env.REDIS_USERNAME,
  };
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
  const missingLiveKitVariables = ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"].filter(
    (name) => !env[name]?.trim(),
  );

  if (missingLiveKitVariables.length > 0) {
    throw new Error(`Agent requires the following environment variables: ${missingLiveKitVariables.join(", ")}`);
  }

  const provider = resolveAgentModelProvider(env);

  const missingVariables = ["API_TOKEN"].filter(() => !getAgentApiToken(env));

  if (provider === "plugins") {
    missingVariables.push(
      ...["DEEPSEEK_API_KEY", "DEEPGRAM_API_KEY", "CARTESIA_API_KEY"].filter((name) => !env[name]?.trim()),
    );
  }

  if (missingVariables.length === 0) {
    return;
  }

  throw new Error(`Agent requires the following environment variables: ${missingVariables.join(", ")}`);
}
