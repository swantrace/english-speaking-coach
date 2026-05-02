import {
  adminApproveUserInputSchema,
  adminRejectUserInputSchema,
  adminSetUserRoleInputSchema,
  adminSoftDeleteUserInputSchema,
  adminUserListQuerySchema,
  adminUserListResponseSchema,
} from "@english-coach/contract/auth";
import { db } from "@english-coach/database";
import { user } from "@english-coach/database/schema";
import { and, count, desc, eq, like, or } from "drizzle-orm";
import type { BackendApp } from "../../http/context";
import { getAuthenticatedUser, parseJsonBody } from "../../http/context";
import { createPageResponse, getPageOffset, normalizePageQuery } from "../../http/pagination";

function toIsoString(value: Date | number | string | null) {
  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

function createUserSearchCondition(search?: string) {
  if (!search) {
    return null;
  }

  const pattern = `%${search}%`;

  return or(like(user.email, pattern), like(user.name, pattern), like(user.id, pattern));
}

async function getUserById(userId: string) {
  const [record] = await db.select().from(user).where(eq(user.id, userId)).limit(1);

  return record ?? null;
}

export function registerAdminUserRoutes(app: BackendApp) {
  // List users for admin search, filtering, and approval workflows.
  app.get("/api/admin/users", async (context) => {
    const parsedQuery = adminUserListQuerySchema.safeParse(normalizePageQuery(context.req.query()));

    if (!parsedQuery.success) {
      return context.json({ error: "Invalid user query parameters" }, 400);
    }

    const { page, pageSize, role, search, status } = parsedQuery.data;
    const offset = getPageOffset(page, pageSize);
    const conditions = [
      role ? eq(user.role, role) : null,
      status ? eq(user.status, status) : null,
      createUserSearchCondition(search),
    ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    const [records, totalResult] = await Promise.all([
      db
        .select({
          createdAt: user.createdAt,
          email: user.email,
          id: user.id,
          lastLoginAt: user.lastLoginAt,
          role: user.role,
          status: user.status,
        })
        .from(user)
        .where(whereCondition)
        .orderBy(desc(user.createdAt), desc(user.id))
        .limit(pageSize)
        .offset(offset),
      db.select({ total: count() }).from(user).where(whereCondition),
    ]);

    return context.json(
      adminUserListResponseSchema.parse(
        createPageResponse(
          records.map((record) => ({
            ...record,
            createdAt: toIsoString(record.createdAt),
            lastLoginAt: toIsoString(record.lastLoginAt),
          })),
          totalResult[0]?.total ?? 0,
          page,
          pageSize,
        ),
      ),
    );
  });

  // Approve a pending or rejected user account.
  app.post("/api/admin/users/:id/approve", async (context) => {
    const parsedBody = await parseJsonBody(context, adminApproveUserInputSchema);

    if (!parsedBody.success) {
      return parsedBody.response;
    }

    const currentUser = getAuthenticatedUser(context);
    const userId = context.req.param("id");
    const existingUser = await getUserById(userId);

    if (!existingUser) {
      return context.json({ error: "User not found" }, 404);
    }

    await db
      .update(user)
      .set({
        approvedAt: new Date(),
        approvedByUserId: currentUser?.id ?? null,
        rejectedAt: null,
        rejectedByUserId: null,
        rejectionReason: null,
        status: "approved",
      })
      .where(eq(user.id, userId));

    return context.json({ id: userId, status: "approved" });
  });

  // Reject a user account awaiting approval.
  app.post("/api/admin/users/:id/reject", async (context) => {
    const parsedBody = await parseJsonBody(context, adminRejectUserInputSchema);

    if (!parsedBody.success) {
      return parsedBody.response;
    }

    const currentUser = getAuthenticatedUser(context);
    const userId = context.req.param("id");
    const existingUser = await getUserById(userId);

    if (!existingUser) {
      return context.json({ error: "User not found" }, 404);
    }

    if (existingUser.role === "admin") {
      return context.json({ error: "Admin users cannot be rejected" }, 400);
    }

    await db
      .update(user)
      .set({
        rejectedAt: new Date(),
        rejectedByUserId: currentUser?.id ?? null,
        status: "rejected",
      })
      .where(eq(user.id, userId));

    return context.json({ id: userId, status: "rejected" });
  });

  // Change a user's role, approving the account when promoting to admin.
  app.post("/api/admin/users/:id/role", async (context) => {
    const parsedBody = await parseJsonBody(context, adminSetUserRoleInputSchema);

    if (!parsedBody.success) {
      return parsedBody.response;
    }

    const currentUser = getAuthenticatedUser(context);
    const userId = context.req.param("id");
    const existingUser = await getUserById(userId);

    if (!existingUser) {
      return context.json({ error: "User not found" }, 404);
    }

    await db
      .update(user)
      .set(
        parsedBody.data.role === "admin"
          ? {
              approvedAt: existingUser.approvedAt ?? new Date(),
              approvedByUserId: existingUser.approvedByUserId ?? currentUser?.id ?? null,
              role: parsedBody.data.role,
              status: "approved",
            }
          : {
              role: parsedBody.data.role,
            },
      )
      .where(eq(user.id, userId));

    return context.json({ id: userId, role: parsedBody.data.role });
  });

  // Soft-delete a user account without removing historical records.
  app.post("/api/admin/users/:id/delete", async (context) => {
    const parsedBody = await parseJsonBody(context, adminSoftDeleteUserInputSchema);

    if (!parsedBody.success) {
      return parsedBody.response;
    }

    const currentUser = getAuthenticatedUser(context);
    const userId = context.req.param("id");
    const existingUser = await getUserById(userId);

    if (!existingUser) {
      return context.json({ error: "User not found" }, 404);
    }

    if (currentUser?.id === userId) {
      return context.json({ error: "You cannot delete your own user account" }, 400);
    }

    if (existingUser.role === "admin") {
      return context.json({ error: "Admin users must be demoted before deletion" }, 400);
    }

    await db
      .update(user)
      .set({
        deletedAt: new Date(),
        deletedByUserId: currentUser?.id ?? null,
        status: "deleted",
      })
      .where(eq(user.id, userId));

    return context.json({ id: userId, status: "deleted" });
  });
}
