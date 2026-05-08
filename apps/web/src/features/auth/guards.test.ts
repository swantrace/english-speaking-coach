import { describe, expect, it } from "vitest";
import { getAuthAreaRedirect, getPendingPageRedirect, resolveHomeRoute } from "./guards";

describe("auth redirects", () => {
  it("keeps approved admins on protected app routes after auth resolves", () => {
    expect(getAuthAreaRedirect("admin_approved", "/app/sessions")).toBe("/app/sessions");
    expect(resolveHomeRoute("admin_approved", "/app/sessions")).toBe("/app/sessions");
  });

  it("does not let student-approved users redirect into admin routes", () => {
    expect(getAuthAreaRedirect("student_approved", "/admin/users")).toBe("/app");
  });

  it("allows approved users to leave pending while preserving an allowed app destination", () => {
    expect(getPendingPageRedirect("admin_approved", "/app/sessions")).toBe("/app/sessions");
  });

  it("rejects protocol-relative redirect targets", () => {
    expect(getAuthAreaRedirect("admin_approved", "//example.test/app/sessions")).toBe("/admin");
  });
});
