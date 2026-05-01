import { isProviderId, type ProviderId, providerIds } from "./ai/registry";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function requireDefaultProviderId(): ProviderId {
  const value = requireEnv("DEFAULT_PROVIDER_ID");

  if (!isProviderId(value)) {
    throw new Error(`Invalid DEFAULT_PROVIDER_ID "${value}". Expected one of: ${providerIds.join(", ")}`);
  }

  return value;
}

export const defaultProviderId = requireDefaultProviderId();
