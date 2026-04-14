import axios from "axios";
import { apiClient } from "@/lib/axios";
import type { CurrentUserResponse } from "./types";
import { normalizeAuthUser } from "./utils";

export const currentUserPath = "/api/session";

export async function getCurrentUser() {
  try {
    const response = await apiClient.get<CurrentUserResponse>(currentUserPath);

    return normalizeAuthUser(response.data?.user ?? null);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return null;
    }

    throw error;
  }
}
