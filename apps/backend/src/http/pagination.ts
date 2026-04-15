import {
  defaultListPage,
  defaultListPageSize,
  maxListPageSize,
  pageListQuerySchema,
} from "@english-coach/contract/common";
import type { z } from "zod";
import { z as zod } from "zod";

const legacyPaginationQuerySchema = pageListQuerySchema.extend({
  limit: pageListQuerySchema.shape.pageSize.optional(),
  offset: zod.coerce.number().int().min(0).optional(),
});

export type PageQuery = z.infer<typeof pageListQuerySchema>;

export function normalizePageQuery(rawQuery: Record<string, string | undefined>) {
  const legacyParsed = legacyPaginationQuerySchema.safeParse(rawQuery);

  if (!legacyParsed.success) {
    return rawQuery;
  }

  const { limit, offset, page, pageSize } = legacyParsed.data;
  const { limit: _rawLimit, offset: _rawOffset, page: _rawPage, pageSize: _rawPageSize, ...rawRest } = rawQuery;

  if (rawQuery.page || rawQuery.pageSize) {
    return {
      ...rawRest,
      page: String(page),
      pageSize: String(pageSize),
    };
  }

  if (typeof limit === "number" || typeof offset === "number") {
    const resolvedPageSize = limit ?? defaultListPageSize;
    const resolvedOffset = typeof offset === "number" ? offset : 0;
    const resolvedPage = Math.floor(resolvedOffset / resolvedPageSize) + 1;

    return {
      ...rawRest,
      page: String(resolvedPage),
      pageSize: String(resolvedPageSize),
    };
  }

  return {
    ...rawRest,
    page: String(page ?? defaultListPage),
    pageSize: String(pageSize ?? defaultListPageSize),
  };
}

export function getPageOffset(page: number, pageSize: number) {
  return (page - 1) * pageSize;
}

export function createPageResponse<TItem>(items: TItem[], total: number, page: number, pageSize: number) {
  return {
    items,
    limit: pageSize,
    offset: getPageOffset(page, pageSize),
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}

export { defaultListPage, defaultListPageSize, maxListPageSize, pageListQuerySchema };
