import {
  scenarioCursorResponseSchema,
  scenarioListQuerySchema,
  scenarioPageResponseSchema,
  scenarioSchema,
} from "@english-coach/contract";
import { db } from "@english-coach/database";
import { scenarios } from "@english-coach/database/schema";
import { and, asc, count, desc, eq, like, lt, or } from "drizzle-orm";
import type { BackendApp } from "../http/context";
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

export function registerScenarioRoutes(app: BackendApp) {
  app.get("/api/scenarios", async (context) => {
    const parsedQuery = scenarioListQuerySchema.safeParse(normalizePageQuery(context.req.query()));

    if (!parsedQuery.success) {
      return context.json({ error: "Invalid scenario query parameters" }, 400);
    }

    const { cursor, page, pageSize, pagination, search, sortBy, sortDirection } = parsedQuery.data;
    const searchCondition = createScenarioSearchCondition(search);

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
      const whereCondition = searchCondition
        ? cursorCondition
          ? and(searchCondition, cursorCondition)
          : searchCondition
        : cursorCondition;
      const records = await db
        .select()
        .from(scenarios)
        .where(whereCondition ?? undefined)
        .orderBy(desc(scenarios.updatedAt), desc(scenarios.id))
        .limit(pageSize + 1);
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
        .where(searchCondition ?? undefined)
        .orderBy(orderExpression, desc(scenarios.id))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: count() })
        .from(scenarios)
        .where(searchCondition ?? undefined),
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

  app.get("/api/scenarios/:id", async (context) => {
    const [record] = await db
      .select()
      .from(scenarios)
      .where(eq(scenarios.id, context.req.param("id")))
      .limit(1);

    if (!record) {
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
    const [existingScenario] = await db.select().from(scenarios).where(eq(scenarios.id, scenarioId)).limit(1);

    if (!existingScenario) {
      return context.json({ error: "Scenario not found" }, 404);
    }

    await db.delete(scenarios).where(eq(scenarios.id, scenarioId));

    return new Response(null, { status: 204 });
  });
}
