import type { AccessState, AuthUser, UserRole, UserStatus } from "./types";

const USER_ROLES = ["student", "admin"] as const satisfies readonly UserRole[];
const USER_STATUSES = ["pending", "approved", "rejected", "deleted"] as const satisfies readonly UserStatus[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getOptionalString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}

function isUserStatus(value: unknown): value is UserStatus {
  return typeof value === "string" && USER_STATUSES.includes(value as UserStatus);
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
