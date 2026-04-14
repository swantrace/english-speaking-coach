import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export interface EmailPasswordAuthInput {
  email: string;
  password: string;
}

export interface AuthMutationError {
  message: string;
  status: number | null;
}

function getErrorStatus(error: unknown) {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return null;
  }

  return typeof error.status === "number" ? error.status : null;
}

function getErrorMessage(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  if ("message" in error && typeof error.message === "string" && error.message.trim().length > 0) {
    return error.message;
  }

  if ("error" in error && typeof error.error === "string" && error.error.trim().length > 0) {
    return error.error;
  }

  return null;
}

function mapAuthError(error: unknown, intent: "sign_in" | "sign_up" | "sign_out"): AuthMutationError {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error)?.toLowerCase() ?? "";

  if (intent === "sign_in") {
    if (
      status === 401 ||
      message.includes("invalid") ||
      message.includes("credential") ||
      message.includes("password") ||
      message.includes("not found")
    ) {
      return {
        message: "Invalid email or password.",
        status,
      };
    }
  }

  if (intent === "sign_up") {
    if (status === 409 || message.includes("exist") || message.includes("already") || message.includes("taken")) {
      return {
        message: "An account with that email already exists.",
        status,
      };
    }
  }

  if (intent === "sign_out") {
    return {
      message: "We couldn't sign you out right now. Please try again.",
      status,
    };
  }

  return {
    message: getErrorMessage(error) ?? "Something went wrong. Please try again.",
    status,
  };
}

function createDisplayNameFromEmail(email: string) {
  const localPart = email.split("@")[0]?.trim();
  return localPart && localPart.length > 0 ? localPart : email;
}

export async function signInWithEmail(input: EmailPasswordAuthInput) {
  try {
    return await authClient.signIn.email({
      email: input.email,
      password: input.password,
    });
  } catch (error) {
    throw mapAuthError(error, "sign_in");
  }
}

export async function signUpWithEmail(input: EmailPasswordAuthInput) {
  try {
    return await authClient.signUp.email({
      email: input.email,
      name: createDisplayNameFromEmail(input.email),
      password: input.password,
    });
  } catch (error) {
    throw mapAuthError(error, "sign_up");
  }
}

export async function signOut() {
  try {
    return await authClient.signOut();
  } catch (error) {
    throw mapAuthError(error, "sign_out");
  }
}

export function useSignInMutation() {
  return useMutation({
    mutationFn: signInWithEmail,
  });
}

export function useSignUpMutation() {
  return useMutation({
    mutationFn: signUpWithEmail,
  });
}

export function useSignOutMutation() {
  return useMutation({
    mutationFn: signOut,
  });
}
