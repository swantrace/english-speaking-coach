import type { AccessArea, AccessState, AuthUser } from "./types";

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

export function getAuthAreaRedirect(accessState: AccessState) {
  return accessState === "anonymous" ? null : resolveHomeRoute(accessState);
}

export function getPendingPageRedirect(accessState: AccessState) {
  switch (accessState) {
    case "student_pending":
      return null;
    case "anonymous":
      return "/signup";
    case "student_rejected":
      return "/rejected";
    case "student_approved":
      return "/app";
    case "admin_approved":
      return "/admin";
    default:
      return "/signup";
  }
}

export function getRejectedPageRedirect(accessState: AccessState) {
  switch (accessState) {
    case "student_rejected":
      return null;
    case "anonymous":
      return "/signup";
    case "student_pending":
      return "/pending";
    case "student_approved":
      return "/app";
    case "admin_approved":
      return "/admin";
    default:
      return "/signup";
  }
}

export function getAppAreaRedirect(accessState: AccessState) {
  switch (accessState) {
    case "student_approved":
    case "admin_approved":
      return null;
    case "anonymous":
      return "/signup";
    case "student_pending":
      return "/pending";
    case "student_rejected":
      return "/rejected";
    default:
      return "/signup";
  }
}

export function getAdminAreaRedirect(accessState: AccessState) {
  switch (accessState) {
    case "admin_approved":
      return null;
    case "student_approved":
      return "/app";
    case "anonymous":
      return "/signup";
    case "student_pending":
      return "/pending";
    case "student_rejected":
      return "/rejected";
    default:
      return "/signup";
  }
}

export function getAccessAreaRedirect(accessState: AccessState, area: AccessArea) {
  switch (area) {
    case "public":
      return null;
    case "auth":
      return getAuthAreaRedirect(accessState);
    case "pending":
      return getPendingPageRedirect(accessState);
    case "rejected":
      return getRejectedPageRedirect(accessState);
    case "app":
      return getAppAreaRedirect(accessState);
    case "admin":
      return getAdminAreaRedirect(accessState);
    default:
      return resolveHomeRoute(accessState);
  }
}
