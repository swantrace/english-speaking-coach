import { type UserRole, type UserStatus, userRoleValues, userStatusValues } from "@english-coach/domain";
import type { AuthSessionUser } from "@/lib/auth-client";
import type { AccessState, AuthUser } from "./types";

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && userRoleValues.includes(value as UserRole);
}

function isUserStatus(value: unknown): value is UserStatus {
  return typeof value === "string" && userStatusValues.includes(value as UserStatus);
}

export function toAuthUser(input: AuthSessionUser | null): AuthUser | null {
  if (!input) {
    return null;
  }

  const { email, id, image, name, role, status } = input;

  if (!isUserRole(role) || !isUserStatus(status)) {
    return null;
  }

  return {
    email,
    id,
    image: image ?? null,
    name: name ?? null,
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
