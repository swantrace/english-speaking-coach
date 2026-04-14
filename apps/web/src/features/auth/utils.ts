import { type UserRole, type UserStatus, userRoleValues, userStatusValues } from "@english-coach/domain";
import type { AccessState, AuthUser } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getOptionalString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && userRoleValues.includes(value as UserRole);
}

function isUserStatus(value: unknown): value is UserStatus {
  return typeof value === "string" && userStatusValues.includes(value as UserStatus);
}

export function normalizeAuthUser(input: unknown): AuthUser | null {
  if (!isRecord(input)) {
    return null;
  }

  const { email, id, image, name, role, status } = input;

  if (typeof id !== "string" || typeof email !== "string") {
    return null;
  }

  if (!isUserRole(role) || !isUserStatus(status)) {
    return null;
  }

  return {
    email,
    id,
    image: getOptionalString(image),
    name: getOptionalString(name),
    role,
    status,
  };
}

export function isApprovedAccessState(accessState: AccessState) {
  return accessState === "student_approved" || accessState === "admin_approved";
}

export function isAnonymousAccessState(accessState: AccessState) {
  return accessState === "anonymous";
}
