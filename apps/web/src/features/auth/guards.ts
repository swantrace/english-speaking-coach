import type { AccessState, AuthUser } from "./types";

export type AccessArea = "public" | "auth" | "pending" | "rejected" | "student_app" | "admin_app";

export function resolveAccessState(user: AuthUser | null | undefined): AccessState {
  if (!user) {
    return "anonymous";
  }

  if (user.role === "admin") {
    return user.status === "approved" ? "admin_approved" : "anonymous";
  }

  if (user.role !== "student") {
    return "anonymous";
  }

  switch (user.status) {
    case "approved":
      return "student_approved";
    case "pending":
      return "student_pending";
    case "rejected":
      return "student_rejected";
    default:
      return "anonymous";
  }
}

export function resolveHomeRoute(accessState: AccessState) {
  switch (accessState) {
    case "student_pending":
      return "/pending";
    case "student_rejected":
      return "/rejected";
    case "student_approved":
      return "/app";
    case "admin_approved":
      return "/admin";
    default:
      return "/";
  }
}

export function canAccessAuthPages(accessState: AccessState) {
  return accessState === "anonymous";
}

export function canAccessPendingPage(accessState: AccessState) {
  return accessState === "student_pending";
}

export function canAccessRejectedPage(accessState: AccessState) {
  return accessState === "student_rejected";
}

export function canAccessStudentApp(accessState: AccessState) {
  return accessState === "student_approved";
}

export function canAccessAdminApp(accessState: AccessState) {
  return accessState === "admin_approved";
}

export function getAccessDeniedRedirect(accessState: AccessState, area: AccessArea) {
  switch (area) {
    case "public":
      return null;
    case "auth":
      return canAccessAuthPages(accessState) ? null : resolveHomeRoute(accessState);
    case "pending":
      return canAccessPendingPage(accessState) ? null : resolveHomeRoute(accessState);
    case "rejected":
      return canAccessRejectedPage(accessState) ? null : resolveHomeRoute(accessState);
    case "student_app":
      if (canAccessStudentApp(accessState)) {
        return null;
      }

      return accessState === "anonymous" ? "/login" : resolveHomeRoute(accessState);
    case "admin_app":
      if (canAccessAdminApp(accessState)) {
        return null;
      }

      return accessState === "anonymous" ? "/login" : resolveHomeRoute(accessState);
    default:
      return resolveHomeRoute(accessState);
  }
}
