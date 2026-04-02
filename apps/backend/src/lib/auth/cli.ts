import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { createAuthOptions } from "./options";

export const auth = betterAuth(
  createAuthOptions(
    drizzleAdapter({} as never, {
      provider: "sqlite",
    }),
  ),
);
