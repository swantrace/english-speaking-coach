import type { AccessArea, AccessState, AuthUser } from "./types";

function normalizeProtectedRedirectPath(redirectTo: string | null | undefined) {
  if (!redirectTo || !redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return null;
  }

  try {
    const url = new URL(redirectTo, "http://localhost");
    const path = `${url.pathname}${url.search}${url.hash}`;

    if (url.pathname === "/app" || url.pathname.startsWith("/app/")) {
      return path;
    }

    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
      return path;
    }
  } catch {
    return null;
  }

  return null;
}

function getAllowedProtectedRedirect(accessState: AccessState, redirectTo: string | null | undefined) {
  const path = normalizeProtectedRedirectPath(redirectTo);

  if (!path) {
    return null;
  }

  if (path === "/app" || path.startsWith("/app/")) {
    return accessState === "student_approved" || accessState === "admin_approved" ? path : null;
  }

  if (path === "/admin" || path.startsWith("/admin/")) {
    return accessState === "admin_approved" ? path : null;
  }

  return null;
}

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

export function resolveHomeRoute(accessState: AccessState, redirectTo?: string | null) {
  const allowedRedirect = getAllowedProtectedRedirect(accessState, redirectTo);

  if (allowedRedirect) {
    return allowedRedirect;
  }

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

export function getAuthAreaRedirect(accessState: AccessState, redirectTo?: string | null) {
  return accessState === "anonymous" ? null : resolveHomeRoute(accessState, redirectTo);
}

export function getPendingPageRedirect(accessState: AccessState, redirectTo?: string | null) {
  switch (accessState) {
    case "student_pending":
      return null;
    case "anonymous":
      return "/signup";
    case "student_rejected":
      return "/rejected";
    case "student_approved":
      return getAllowedProtectedRedirect(accessState, redirectTo) ?? "/app";
    case "admin_approved":
      return getAllowedProtectedRedirect(accessState, redirectTo) ?? "/admin";
    default:
      return "/signup";
  }
}

export function getRejectedPageRedirect(accessState: AccessState, redirectTo?: string | null) {
  switch (accessState) {
    case "student_rejected":
      return null;
    case "anonymous":
      return "/signup";
    case "student_pending":
      return "/pending";
    case "student_approved":
      return getAllowedProtectedRedirect(accessState, redirectTo) ?? "/app";
    case "admin_approved":
      return getAllowedProtectedRedirect(accessState, redirectTo) ?? "/admin";
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
