import type { BetterAuthOptions } from "better-auth";

export const authTrustedOrigins = ["http://localhost:5173", "https://english-speaking-coach.com"];

const isProduction = process.env.NODE_ENV === "production";
const localCookieAttributes = {
  sameSite: "lax",
  secure: false,
} as const;

const productionCookieAttributes = {
  sameSite: "none",
  secure: true,
} as const;

export function createAuthOptions(database: BetterAuthOptions["database"]): BetterAuthOptions {
  return {
    advanced: {
      crossSubDomainCookies: {
        enabled: isProduction,
        domain: "english-speaking-coach.com",
      },
      defaultCookieAttributes: isProduction ? productionCookieAttributes : localCookieAttributes,
      useSecureCookies: isProduction,
    },
    appName: "English Speaking Coach",
    basePath: "/api/auth",
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
    database,
    emailAndPassword: {
      enabled: true,
    },
    secret: process.env.BETTER_AUTH_SECRET ?? "development-secret-change-me-before-production-1234",
    trustedOrigins: authTrustedOrigins,
    user: {
      additionalFields: {
        role: {
          type: "string",
          defaultValue: "student",
          required: false,
          input: false,
        },
      },
    },
  };
}
