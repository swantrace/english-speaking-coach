const defaultProductionOrigin = "https://english-speaking-coach-2.vercel.app";
const developmentLoopbackOrigins = ["http://localhost:*", "http://127.0.0.1:*"];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesOriginPattern(origin: string, pattern: string) {
  const expression = escapeRegExp(pattern).replaceAll("\\*", "[^/]*");
  return new RegExp(`^${expression}$`).test(origin);
}

export function resolveAuthTrustedOrigins(env: NodeJS.ProcessEnv = process.env) {
  const configuredOrigins = (env.AUTH_TRUSTED_ORIGINS ?? defaultProductionOrigin)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (env.NODE_ENV === "production") {
    return configuredOrigins;
  }

  return [...new Set([...configuredOrigins, ...developmentLoopbackOrigins])];
}

export function resolveCorsOrigin(origin: string, trustedOrigins: readonly string[]) {
  return trustedOrigins.some((trustedOrigin) => matchesOriginPattern(origin, trustedOrigin)) ? origin : undefined;
}
