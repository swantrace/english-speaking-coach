import { describe, expect, test } from "bun:test";
import { app } from "./api";

async function signUpAndCreateSession() {
  const email = `coach-auth-${Date.now()}@example.com`;
  const password = "password1234";

  const signUpResponse = await app.request("http://localhost/api/auth/sign-up/email", {
    body: JSON.stringify({
      email,
      name: "Coach Auth Tester",
      password,
    }),
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost:5173",
    },
    method: "POST",
  });

  expect(signUpResponse.status).toBe(200);

  const cookie = signUpResponse.headers.get("set-cookie");

  expect(cookie).toBeTruthy();

  if (!cookie) {
    throw new Error("Expected sign-up to create a session cookie");
  }

  return { cookie, email };
}

async function signUpUser() {
  const email = `coach-login-${Date.now()}@example.com`;
  const password = "password1234";

  const signUpResponse = await app.request("http://localhost/api/auth/sign-up/email", {
    body: JSON.stringify({
      email,
      name: "Coach Login Tester",
      password,
    }),
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost:5173",
    },
    method: "POST",
  });

  expect(signUpResponse.status).toBe(200);
  await expect(signUpResponse.json()).resolves.toMatchObject({
    user: {
      email,
      emailVerified: false,
      name: "Coach Login Tester",
    },
  });

  return { email, password };
}

describe("auth protection", () => {
  test("uses browser-accepted cookie attributes in local development", async () => {
    const { cookie } = await signUpAndCreateSession();

    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain("SameSite=None");
    expect(cookie).not.toContain("Secure");
    expect(cookie).not.toContain("Domain=localhost");
  });

  test("rejects anonymous access and returns session data for signed-in users", async () => {
    const unauthorizedResponse = await app.request("http://localhost/api/session");

    expect(unauthorizedResponse.status).toBe(401);
    await expect(unauthorizedResponse.json()).resolves.toEqual({
      error: "Authentication required",
    });

    const { cookie, email } = await signUpAndCreateSession();

    const authorizedResponse = await app.request("http://localhost/api/session", {
      headers: {
        Cookie: cookie,
      },
    });

    expect(authorizedResponse.status).toBe(200);

    await expect(authorizedResponse.json()).resolves.toMatchObject({
      session: {
        id: expect.any(String),
        userId: expect.any(String),
      },
      user: {
        email,
        name: "Coach Auth Tester",
      },
    });

    const unauthorizedTokenResponse = await app.request("http://localhost/api/sessions/token", {
      body: JSON.stringify({
        contextDocument: "Talk about ordering lunch politely.",
        sessionType: "free-form",
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    expect(unauthorizedTokenResponse.status).toBe(401);
    await expect(unauthorizedTokenResponse.json()).resolves.toEqual({
      error: "Authentication required",
    });
  });

  test("allows email/password sign-in even when emailVerified is false", async () => {
    const { email, password } = await signUpUser();

    const signInResponse = await app.request("http://localhost/api/auth/sign-in/email", {
      body: JSON.stringify({
        email,
        password,
      }),
      headers: {
        "Content-Type": "application/json",
        origin: "http://localhost:5173",
      },
      method: "POST",
    });

    expect(signInResponse.status).toBe(200);
    expect(signInResponse.headers.get("set-cookie")).toBeTruthy();
    await expect(signInResponse.json()).resolves.toMatchObject({
      user: {
        email,
        emailVerified: false,
        name: "Coach Login Tester",
      },
    });
  });
});
