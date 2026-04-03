import { scenarioSchema } from "@english-coach/contract";
import { db } from "@english-coach/database";
import { scenarios } from "@english-coach/database/schema";
import { count, desc, eq } from "drizzle-orm";
import type { BackendApp } from "../http/context";
import { requireAdmin } from "../http/guards";
import { createPaginatedResponse, paginationQuerySchema } from "../http/pagination";

export function registerScenarioRoutes(app: BackendApp) {
  app.get("/api/scenarios", async (context) => {
    const parsedQuery = paginationQuerySchema.safeParse(context.req.query());

    if (!parsedQuery.success) {
      return context.json({ error: "Invalid scenario query parameters" }, 400);
    }

    const { limit, offset } = parsedQuery.data;
    const [records, totalResult] = await Promise.all([
      db.select().from(scenarios).orderBy(desc(scenarios.updatedAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(scenarios),
    ]);

    return context.json(
      createPaginatedResponse(
        records.map((record) => scenarioSchema.parse(record)),
        totalResult[0]?.total ?? 0,
        limit,
        offset,
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
