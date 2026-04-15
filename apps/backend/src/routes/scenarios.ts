import {
  adminScenarioCreateSchema,
  adminScenarioListQuerySchema,
  adminScenarioListResponseSchema,
  adminScenarioUpdateSchema,
  learnerScenarioListQuerySchema,
  scenarioCursorResponseSchema,
  scenarioPageResponseSchema,
  scenarioSchema,
} from "@english-coach/contract/scenario";
import { db } from "@english-coach/database";
import { scenarios } from "@english-coach/database/schema";
import { and, asc, count, desc, eq, like, lt, or } from "drizzle-orm";
import type { BackendApp } from "../http/context";
import { getAuthenticatedUser, parseJsonBody } from "../http/context";
import { requireAdmin } from "../http/guards";
import { createPageResponse, getPageOffset, normalizePageQuery } from "../http/pagination";

const scenarioSortColumnMap = {
  createdAt: scenarios.createdAt,
  title: scenarios.title,
  updatedAt: scenarios.updatedAt,
} as const;

function encodeScenarioCursor(record: { id: string; updatedAt: string }) {
  return `${record.updatedAt}::${record.id}`;
}

function decodeScenarioCursor(cursor: string) {
  const [updatedAt, ...idParts] = cursor.split("::");
  const id = idParts.join("::").trim();

  if (!updatedAt || !id) {
    return null;
  }

  return { id, updatedAt };
}

function createScenarioSearchCondition(search?: string) {
  if (!search) {
    return null;
  }

  const pattern = `%${search}%`;

  return or(like(scenarios.title, pattern), like(scenarios.setting, pattern), like(scenarios.characters, pattern));
}

function createScenarioFilterCondition(options: {
  approvedOnly?: boolean;
  isPendingReview?: (typeof scenarios.$inferSelect)["isPendingReview"];
  search?: string;
}) {
  const conditions = [
    options.approvedOnly ? eq(scenarios.isPendingReview, false) : null,
    options.isPendingReview !== undefined ? eq(scenarios.isPendingReview, options.isPendingReview) : null,
    createScenarioSearchCondition(options.search),
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));

  if (conditions.length === 0) {
    return undefined;
  }

  return and(...conditions);
}

async function getScenarioRecordById(scenarioId: string) {
  const [record] = await db.select().from(scenarios).where(eq(scenarios.id, scenarioId)).limit(1);

  return record ?? null;
}

async function deleteScenarioRecord(scenarioId: string) {
  const existingScenario = await getScenarioRecordById(scenarioId);

  if (!existingScenario) {
    return null;
  }

  await db.delete(scenarios).where(eq(scenarios.id, scenarioId));

  return existingScenario;
}

export function registerScenarioRoutes(app: BackendApp) {
  app.get("/api/learner/scenarios", async (context) => {
    const parsedQuery = learnerScenarioListQuerySchema.safeParse(normalizePageQuery(context.req.query()));

    if (!parsedQuery.success) {
      return context.json({ error: "Invalid scenario query parameters" }, 400);
    }

    const { cursor, page, pageSize, pagination, search, sortBy, sortDirection } = parsedQuery.data;
    const approvedCondition = createScenarioFilterCondition({ approvedOnly: true, search });

    if (pagination === "cursor") {
      const decodedCursor = cursor ? decodeScenarioCursor(cursor) : null;

      if (cursor && !decodedCursor) {
        return context.json({ error: "Invalid scenario cursor" }, 400);
      }

      const cursorCondition = decodedCursor
        ? or(
            lt(scenarios.updatedAt, decodedCursor.updatedAt),
            and(eq(scenarios.updatedAt, decodedCursor.updatedAt), lt(scenarios.id, decodedCursor.id)),
          )
        : null;
      const whereCondition = approvedCondition
        ? cursorCondition
          ? and(approvedCondition, cursorCondition)
          : approvedCondition
        : (cursorCondition ?? undefined);
      const [records, totalResult] = await Promise.all([
        db
          .select()
          .from(scenarios)
          .where(whereCondition)
          .orderBy(desc(scenarios.updatedAt), desc(scenarios.id))
          .limit(pageSize + 1),
        db.select({ total: count() }).from(scenarios).where(approvedCondition),
      ]);
      const hasMore = records.length > pageSize;
      const pageRecords = hasMore ? records.slice(0, pageSize) : records;

      return context.json(
        scenarioCursorResponseSchema.parse({
          hasMore,
          items: pageRecords.map((record) => scenarioSchema.parse(record)),
          limit: pageSize,
          nextCursor: hasMore
            ? encodeScenarioCursor(pageRecords[pageRecords.length - 1] as { id: string; updatedAt: string })
            : null,
          total: totalResult[0]?.total ?? 0,
        }),
      );
    }

    const offset = getPageOffset(page, pageSize);
    const orderColumn = scenarioSortColumnMap[sortBy];
    const orderExpression = sortDirection === "asc" ? asc(orderColumn) : desc(orderColumn);
    const [records, totalResult] = await Promise.all([
      db
        .select()
        .from(scenarios)
        .where(approvedCondition)
        .orderBy(orderExpression, desc(scenarios.id))
        .limit(pageSize)
        .offset(offset),
      db.select({ total: count() }).from(scenarios).where(approvedCondition),
    ]);

    return context.json(
      scenarioPageResponseSchema.parse(
        createPageResponse(
          records.map((record) => scenarioSchema.parse(record)),
          totalResult[0]?.total ?? 0,
          page,
          pageSize,
        ),
      ),
    );
  });

  app.get("/api/admin/scenarios", async (context) => {
    const parsedQuery = adminScenarioListQuerySchema.safeParse(normalizePageQuery(context.req.query()));

    if (!parsedQuery.success) {
      return context.json({ error: "Invalid scenario query parameters" }, 400);
    }

    const { isPendingReview, page, pageSize, search, sortBy, sortDirection } = parsedQuery.data;
    const offset = getPageOffset(page, pageSize);
    const filterCondition = createScenarioFilterCondition({ isPendingReview, search });
    const orderColumn = scenarioSortColumnMap[sortBy];
    const orderExpression = sortDirection === "asc" ? asc(orderColumn) : desc(orderColumn);
    const [records, totalResult] = await Promise.all([
      db
        .select()
        .from(scenarios)
        .where(filterCondition)
        .orderBy(orderExpression, desc(scenarios.id))
        .limit(pageSize)
        .offset(offset),
      db.select({ total: count() }).from(scenarios).where(filterCondition),
    ]);

    return context.json(
      adminScenarioListResponseSchema.parse(
        createPageResponse(
          records.map((record) => scenarioSchema.parse(record)),
          totalResult[0]?.total ?? 0,
          page,
          pageSize,
        ),
      ),
    );
  });

  app.post("/api/admin/scenarios", async (context) => {
    const parsedBody = await parseJsonBody(context, adminScenarioCreateSchema);

    if (!parsedBody.success) {
      return parsedBody.response;
    }

    const now = new Date().toISOString();
    const scenarioId = crypto.randomUUID();

    await db.insert(scenarios).values({
      characters: parsedBody.data.characters,
      createdAt: now,
      exampleDialogue: parsedBody.data.exampleDialogue,
      goals: parsedBody.data.goals,
      id: scenarioId,
      imageUrl: parsedBody.data.imageUrl ?? null,
      isPendingReview: parsedBody.data.isPendingReview ?? false,
      setting: parsedBody.data.setting,
      tags: parsedBody.data.tags ?? [],
      title: parsedBody.data.title,
      updatedAt: now,
    });

    const createdScenario = await getScenarioRecordById(scenarioId);

    return context.json(scenarioSchema.parse(createdScenario), 201);
  });

  app.patch("/api/admin/scenarios/:id", async (context) => {
    const parsedBody = await parseJsonBody(context, adminScenarioUpdateSchema);

    if (!parsedBody.success) {
      return parsedBody.response;
    }

    const scenarioId = context.req.param("id");
    const existingScenario = await getScenarioRecordById(scenarioId);

    if (!existingScenario) {
      return context.json({ error: "Scenario not found" }, 404);
    }

    const now = new Date().toISOString();

    await db
      .update(scenarios)
      .set({
        characters: parsedBody.data.characters ?? existingScenario.characters,
        exampleDialogue: parsedBody.data.exampleDialogue ?? existingScenario.exampleDialogue,
        goals: parsedBody.data.goals ?? existingScenario.goals,
        imageUrl: parsedBody.data.imageUrl === undefined ? existingScenario.imageUrl : parsedBody.data.imageUrl,
        isPendingReview: parsedBody.data.isPendingReview ?? existingScenario.isPendingReview,
        setting: parsedBody.data.setting ?? existingScenario.setting,
        tags: parsedBody.data.tags ?? existingScenario.tags,
        title: parsedBody.data.title ?? existingScenario.title,
        updatedAt: now,
      })
      .where(eq(scenarios.id, scenarioId));

    const updatedScenario = await getScenarioRecordById(scenarioId);

    return context.json(scenarioSchema.parse(updatedScenario));
  });

  app.delete("/api/admin/scenarios/:id", async (context) => {
    const deletedScenario = await deleteScenarioRecord(context.req.param("id"));

    if (!deletedScenario) {
      return context.json({ error: "Scenario not found" }, 404);
    }

    return new Response(null, { status: 204 });
  });

  app.get("/api/scenarios/:id", async (context) => {
    const record = await getScenarioRecordById(context.req.param("id"));

    if (!record) {
      return context.json({ error: "Scenario not found" }, 404);
    }

    if (getAuthenticatedUser(context)?.role !== "admin" && record.isPendingReview) {
      return context.json({ error: "Scenario not found" }, 404);
    }

    return context.json(scenarioSchema.parse(record));
  });

  app.delete("/api/scenarios/:id", async (context) => {
    const adminError = requireAdmin(context);

    if (adminError) {
      return adminError;
    }

    const scenarioId = context.req.param("id");
    const existingScenario = await deleteScenarioRecord(scenarioId);

    if (!existingScenario) {
      return context.json({ error: "Scenario not found" }, 404);
    }

    return new Response(null, { status: 204 });
  });
}
