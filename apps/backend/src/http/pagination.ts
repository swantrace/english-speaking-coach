import { z } from "zod";

export const defaultPaginationLimit = 20;
export const maxPaginationLimit = 100;

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(maxPaginationLimit).default(defaultPaginationLimit),
  offset: z.coerce.number().int().min(0).default(0),
});

export function createPaginatedResponse<TItem>(items: TItem[], total: number, limit: number, offset: number) {
  return {
    items,
    limit,
    offset,
    total,
  };
}
