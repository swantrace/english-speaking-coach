import { Button, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@english-coach/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import {
  apiJson,
  type KnowledgeItem,
  knowledgeOccurrencesQueryKey,
  useUnresolvedKnowledgeOccurrences,
} from "../../lib/app-data";
import { Card, PageState } from "../../lib/app-shell";
import type { AdminKnowledgeQueryState } from "./admin-knowledge-query-state";

function summarizeTurn(sessionHistoryId: string, turnIndex: number) {
  return `${sessionHistoryId.slice(0, 8)} · turn ${turnIndex + 1}`;
}

export function AdminKnowledgeOccurrencesTab({
  allKnowledgeItems,
  queryState,
}: {
  allKnowledgeItems: KnowledgeItem[];
  queryState: AdminKnowledgeQueryState;
}) {
  const queryClient = useQueryClient();
  const [assignDrafts, setAssignDrafts] = useState<Record<string, string>>({});
  const occurrences = useUnresolvedKnowledgeOccurrences({
    page: queryState.page,
    pageSize: queryState.pageSize,
    search: queryState.search,
  });
  const knownPatterns = useMemo(
    () => new Set(allKnowledgeItems.map((item) => item.pattern.trim().toLowerCase())),
    [allKnowledgeItems],
  );

  const assignOccurrence = useMutation({
    mutationFn: async ({ knowledgeItemId, occurrenceId }: { knowledgeItemId: string; occurrenceId: string }) =>
      apiJson(`/api/admin/knowledge-occurrences/${occurrenceId}`, z.object({ id: z.string() }), {
        body: JSON.stringify({ knowledgeItemId }),
        method: "PATCH",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: knowledgeOccurrencesQueryKey });
    },
  });

  const resolveOccurrence = useMutation({
    mutationFn: async (occurrenceId: string) =>
      apiJson("/api/admin/knowledge-occurrences/resolve", z.object({ occurrenceId: z.string() }), {
        body: JSON.stringify({ occurrenceId }),
        method: "POST",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: knowledgeOccurrencesQueryKey });
    },
  });

  const totalPages = Math.max(occurrences.data?.totalPages ?? 0, 1);

  return (
    <Card className="grid gap-5">
      <div className="grid gap-2">
        <h2 className="text-2xl text-slate-950">Unresolved occurrences</h2>
        <p className="text-sm leading-7 text-slate-600">
          Assign each occurrence to an existing knowledge item or enqueue one new knowledge-item generation job.
        </p>
      </div>

      {occurrences.error ? (
        <PageState description={occurrences.error.message} title="Could not load occurrences" />
      ) : null}
      {!occurrences.error ? (
        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200">
                <TableHead className="text-slate-600">Session turn</TableHead>
                <TableHead className="text-slate-600">Proposed pattern</TableHead>
                <TableHead className="text-slate-600">Utterance</TableHead>
                <TableHead className="text-slate-600">Assign existing</TableHead>
                <TableHead className="text-right text-slate-600">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {occurrences.data?.items.length ? (
                occurrences.data.items.map((occurrence) => {
                  const draftValue = assignDrafts[occurrence.id] ?? "";

                  return (
                    <TableRow className="border-slate-200" key={occurrence.id}>
                      <TableCell className="text-sm text-slate-600">
                        {summarizeTurn(occurrence.sessionHistoryId, occurrence.transcriptTurnIndex)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-900">{occurrence.proposedPattern}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-700">{occurrence.utterance}</span>
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-9 border-slate-200 bg-white text-slate-900"
                          onChange={(event) =>
                            setAssignDrafts((previous) => ({ ...previous, [occurrence.id]: event.target.value }))
                          }
                          placeholder="Knowledge item ID"
                          value={draftValue}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            disabled={assignOccurrence.isPending || draftValue.trim().length === 0}
                            onClick={() =>
                              void assignOccurrence.mutateAsync({
                                knowledgeItemId: draftValue.trim(),
                                occurrenceId: occurrence.id,
                              })
                            }
                            size="sm"
                            variant="outline"
                          >
                            Assign
                          </Button>
                          <Button
                            disabled={resolveOccurrence.isPending}
                            onClick={() => void resolveOccurrence.mutateAsync(occurrence.id)}
                            size="sm"
                          >
                            Create + assign
                          </Button>
                        </div>
                        {knownPatterns.has(occurrence.proposedPattern.trim().toLowerCase()) ? (
                          <p className="mt-2 text-right text-xs text-amber-700">Pattern already exists in catalog.</p>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow className="border-slate-200">
                  <TableCell className="h-24 text-center text-slate-500" colSpan={5}>
                    {occurrences.isPending ? "Loading unresolved occurrences..." : "No unresolved occurrences."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
        <span>
          Page {queryState.page} of {Math.max(totalPages, 1)} · {occurrences.data?.total ?? 0} unresolved occurrences
        </span>
        <div className="flex items-center gap-3">
          <Button
            disabled={queryState.page <= 1}
            onClick={() => queryState.setPage(queryState.page - 1)}
            variant="outline"
          >
            Previous
          </Button>
          <Button disabled={queryState.page >= totalPages} onClick={() => queryState.setPage(queryState.page + 1)}>
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}
