import { describe, expect, test } from "bun:test";
import { resolveAuthTrustedOrigins, resolveCorsOrigin } from "./origin-config";

describe("resolveAuthTrustedOrigins", () => {
  test("allows changing localhost ports outside production", () => {
    expect(
      resolveAuthTrustedOrigins({
        AUTH_TRUSTED_ORIGINS: "http://localhost:5173",
        NODE_ENV: "development",
      }),
    ).toEqual(["http://localhost:5173", "http://localhost:*", "http://127.0.0.1:*"]);
  });

  test("does not add loopback wildcards in production", () => {
    expect(
      resolveAuthTrustedOrigins({
        AUTH_TRUSTED_ORIGINS: "https://coach.example",
        NODE_ENV: "production",
      }),
    ).toEqual(["https://coach.example"]);
  });
});

describe("resolveCorsOrigin", () => {
  const developmentOrigins = resolveAuthTrustedOrigins({
    AUTH_TRUSTED_ORIGINS: "http://localhost:5173,https://coach.example",
    NODE_ENV: "development",
  });

  test("accepts Vite fallback ports on loopback hosts", () => {
    expect(resolveCorsOrigin("http://localhost:5174", developmentOrigins)).toBe("http://localhost:5174");
    expect(resolveCorsOrigin("http://127.0.0.1:5199", developmentOrigins)).toBe("http://127.0.0.1:5199");
  });

  test("accepts explicitly configured origins", () => {
    expect(resolveCorsOrigin("https://coach.example", developmentOrigins)).toBe("https://coach.example");
  });

  test("rejects untrusted hosts that contain localhost in their name", () => {
    expect(resolveCorsOrigin("http://localhost.attacker.example:5174", developmentOrigins)).toBeUndefined();
  });
});
