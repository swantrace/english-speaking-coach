import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { createFreeFormSession, createRolePlaySession } from "./api";
import {
  mapFreeFormSessionFormInputToRequest,
  mapFreeFormSessionResult,
  mapRolePlaySessionFormInputToRequest,
  mapRolePlaySessionResult,
} from "./mappers";
import type {
  CreateFreeFormSessionFormInput,
  CreateRolePlaySessionFormInput,
  SessionMutationError,
  SessionStartResult,
} from "./types";

interface SessionMutationOptions {
  onSuccess?: (result: SessionStartResult) => void | Promise<void>;
}

function mapSessionMutationError(error: unknown): SessionMutationError {
  if (error instanceof AxiosError) {
    const status = error.response?.status ?? null;
    const apiMessage =
      typeof error.response?.data === "object" &&
      error.response?.data !== null &&
      "error" in error.response.data &&
      typeof error.response.data.error === "string"
        ? error.response.data.error
        : null;

    if (status === 404) {
      return {
        message: "The selected practice setup could not be found anymore. Please refresh and try again.",
        status,
      };
    }

    if (status === 401) {
      return {
        message: "Your session has expired. Please sign in again and retry.",
        status,
      };
    }

    if (status === 400) {
      return {
        message: apiMessage ?? "The session request was invalid. Please review the form and try again.",
        status,
      };
    }

    return {
      message: apiMessage ?? "We couldn't start the session right now. Please try again.",
      status,
    };
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return {
      message: error.message,
      status: null,
    };
  }

  return {
    message: "We couldn't start the session right now. Please try again.",
    status: null,
  };
}

export function useCreateRolePlaySessionMutation(options: SessionMutationOptions = {}) {
  return useMutation<SessionStartResult, SessionMutationError, CreateRolePlaySessionFormInput>({
    mutationFn: async (input) => {
      try {
        const response = await createRolePlaySession(mapRolePlaySessionFormInputToRequest(input));
        return mapRolePlaySessionResult(response, input);
      } catch (error) {
        throw mapSessionMutationError(error);
      }
    },
    onSuccess: options.onSuccess,
  });
}

export function useCreateFreeFormSessionMutation(options: SessionMutationOptions = {}) {
  return useMutation<SessionStartResult, SessionMutationError, CreateFreeFormSessionFormInput>({
    mutationFn: async (input) => {
      try {
        const response = await createFreeFormSession(mapFreeFormSessionFormInputToRequest(input));
        return mapFreeFormSessionResult(response, input);
      } catch (error) {
        throw mapSessionMutationError(error);
      }
    },
    onSuccess: options.onSuccess,
  });
}
