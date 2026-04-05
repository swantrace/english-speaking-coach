import {
  adminKnowledgeItemCreateSchema,
  type KnowledgeItem,
  type KnowledgeItemReviewStatus,
  type KnowledgeItemSource,
  knowledgeItemSchema,
} from "@english-coach/contract";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@english-coach/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import {
  apiJson,
  apiVoid,
  connectionStyles,
  createSubmission,
  ellipsize,
  formatClock,
  formatTimestamp,
  getJobStatusTone,
  humanizeLabel,
  knowledgeItemsQueryKey,
  useKnowledgeGenerateHistory,
  useKnowledgeItemsList,
  useViewer,
} from "../../lib/app-data";
import { AdminGate, Card, PageIntro, PageState } from "../../lib/app-shell";
import { knowledgeGenerateStore, useKnowledgeGenerateStore } from "../../lib/knowledge-generate-store";

type KnowledgeItemFormDraft = {
  communicativeFunction: KnowledgeItem["communicativeFunction"];
  example: string;
  fixednessLevel: KnowledgeItem["fixednessLevel"];
  pattern: string;
  reviewStatus: KnowledgeItemReviewStatus;
  syntaxRole: KnowledgeItem["syntaxRole"];
};

function createEmptyKnowledgeItemDraft(): KnowledgeItemFormDraft {
  return {
    communicativeFunction: null,
    example: "",
    fixednessLevel: null,
    pattern: "",
    reviewStatus: "approved",
    syntaxRole: null,
  };
}

function createDraftFromKnowledgeItem(item: KnowledgeItem): KnowledgeItemFormDraft {
  return {
    communicativeFunction: item.communicativeFunction,
    example: item.example ?? "",
    fixednessLevel: item.fixednessLevel,
    pattern: item.pattern,
    reviewStatus: item.reviewStatus,
    syntaxRole: item.syntaxRole,
  };
}

function parseKnowledgeItemDraft(draft: KnowledgeItemFormDraft) {
  const parsedDraft = adminKnowledgeItemCreateSchema.safeParse({
    communicativeFunction: draft.communicativeFunction,
    example: draft.example.trim() || null,
    fixednessLevel: draft.fixednessLevel,
    pattern: draft.pattern,
    reviewStatus: draft.reviewStatus,
    syntaxRole: draft.syntaxRole,
  });

  if (!parsedDraft.success) {
    throw new Error(parsedDraft.error.issues[0]?.message ?? "Knowledge item form is invalid.");
  }

  return parsedDraft.data;
}

function getReviewBadgeClassName(reviewStatus: KnowledgeItemReviewStatus) {
  if (reviewStatus === "approved") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  }

  if (reviewStatus === "rejected") {
    return "border-rose-400/30 bg-rose-400/10 text-rose-100";
  }

  return "border-amber-400/30 bg-amber-400/10 text-amber-100";
}

function getSourceBadgeClassName(source: KnowledgeItemSource) {
  if (source === "admin") {
    return "border-cyan-400/30 bg-cyan-400/10 text-cyan-100";
  }

  return "border-violet-400/30 bg-violet-400/10 text-violet-100";
}

function KnowledgeBadge({ tone, value }: { tone: string; value: string }) {
  return (
    <Badge className={tone} variant="outline">
      {humanizeLabel(value)}
    </Badge>
  );
}

function useAdminKnowledgeQueryState() {
  const currentSearch = useSearch({ from: "/admin/knowledge-items" });
  const navigate = useNavigate({ from: "/admin/knowledge-items" });

  const updateSearch = (updater: (previous: typeof currentSearch) => typeof currentSearch) => {
    void navigate({ search: updater, to: "/admin/knowledge-items" });
  };

  return {
    ...currentSearch,
    query: {
      page: currentSearch.page,
      pageSize: currentSearch.pageSize,
      reviewStatus: currentSearch.reviewStatus,
      search: currentSearch.search,
      sortBy: currentSearch.sortBy,
      sortDirection: currentSearch.sortDirection,
      source: currentSearch.source,
      tab: currentSearch.tab,
    },
    setPage: (page: number) => updateSearch((previous) => ({ ...previous, page })),
    setPageSize: (pageSize: number) => updateSearch((previous) => ({ ...previous, page: 1, pageSize })),
    setReviewStatus: (reviewStatus?: KnowledgeItemReviewStatus) =>
      updateSearch((previous) => ({ ...previous, page: 1, reviewStatus })),
    setSearch: (search?: string) =>
      updateSearch((previous) => ({ ...previous, page: 1, search: search?.trim() || undefined })),
    setSort: (
      sortBy: "updatedAt" | "createdAt" | "pattern" | "reviewStatus" | "source",
      sortDirection: "asc" | "desc",
    ) => updateSearch((previous) => ({ ...previous, page: 1, sortBy, sortDirection })),
    setSource: (source?: KnowledgeItemSource) =>
      updateSearch((previous) => ({ ...previous, page: 1, source: source ?? "all" })),
    setTab: (tab: "manage" | "generate") => updateSearch((previous) => ({ ...previous, tab })),
  };
}

function KnowledgeItemFormDialog({
  draft,
  error,
  isPending,
  mode,
  onDraftChange,
  onOpenChange,
  onSubmit,
  open,
}: {
  draft: KnowledgeItemFormDraft;
  error?: string;
  isPending: boolean;
  mode: "create" | "edit";
  onDraftChange: (draft: KnowledgeItemFormDraft) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-3xl border-white/10 bg-slate-950 text-slate-50">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create knowledge item" : "Edit knowledge item"}</DialogTitle>
          <DialogDescription className="text-slate-400">
            Keep origin and review state separate. Source shows where the item came from; review status controls whether
            it is approved.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2 text-sm text-slate-200">
            <span>Pattern</span>
            <Textarea
              className="min-h-24 border-white/10 bg-slate-900 text-slate-50"
              onChange={(event) => onDraftChange({ ...draft, pattern: event.target.value })}
              value={draft.pattern}
            />
          </div>
          <div className="grid gap-2 text-sm text-slate-200">
            <span>Example</span>
            <Textarea
              className="min-h-24 border-white/10 bg-slate-900 text-slate-50"
              onChange={(event) => onDraftChange({ ...draft, example: event.target.value })}
              value={draft.example}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="grid gap-2 text-sm text-slate-200">
              <span>Syntax role</span>
              <Select
                onValueChange={(value: string) =>
                  onDraftChange({ ...draft, syntaxRole: value ? (value as KnowledgeItem["syntaxRole"]) : null })
                }
                value={draft.syntaxRole ?? "unset"}
              >
                <SelectTrigger className="border-white/10 bg-slate-900 text-slate-50">
                  <SelectValue placeholder="Choose syntax role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Unset</SelectItem>
                  <SelectItem value="predicate_verb">Predicate verb</SelectItem>
                  <SelectItem value="predicate_adjective">Predicate adjective</SelectItem>
                  <SelectItem value="adverbial_modifier">Adverbial modifier</SelectItem>
                  <SelectItem value="noun_phrase">Noun phrase</SelectItem>
                  <SelectItem value="discourse_linker">Discourse linker</SelectItem>
                  <SelectItem value="clause_pattern">Clause pattern</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 text-sm text-slate-200">
              <span>Fixedness</span>
              <Select
                onValueChange={(value: string) =>
                  onDraftChange({ ...draft, fixednessLevel: value ? (value as KnowledgeItem["fixednessLevel"]) : null })
                }
                value={draft.fixednessLevel ?? "unset"}
              >
                <SelectTrigger className="border-white/10 bg-slate-900 text-slate-50">
                  <SelectValue placeholder="Choose fixedness" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Unset</SelectItem>
                  <SelectItem value="restricted_collocation">Restricted collocation</SelectItem>
                  <SelectItem value="fixed_expression">Fixed expression</SelectItem>
                  <SelectItem value="idiom">Idiom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 text-sm text-slate-200">
              <span>Function</span>
              <Select
                onValueChange={(value: string) =>
                  onDraftChange({
                    ...draft,
                    communicativeFunction: value ? (value as KnowledgeItem["communicativeFunction"]) : null,
                  })
                }
                value={draft.communicativeFunction ?? "unset"}
              >
                <SelectTrigger className="border-white/10 bg-slate-900 text-slate-50">
                  <SelectValue placeholder="Choose function" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Unset</SelectItem>
                  <SelectItem value="manage_social_relation">Manage social relation</SelectItem>
                  <SelectItem value="express_attitude_or_opinion">Express attitude or opinion</SelectItem>
                  <SelectItem value="make_request_or_offer">Make request or offer</SelectItem>
                  <SelectItem value="give_or_seek_information">Give or seek information</SelectItem>
                  <SelectItem value="organize_discourse">Organize discourse</SelectItem>
                  <SelectItem value="react_in_conversation">React in conversation</SelectItem>
                  <SelectItem value="express_degree_or_soften">Express degree or soften</SelectItem>
                  <SelectItem value="express_time_or_sequence">Express time or sequence</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 text-sm text-slate-200">
              <span>Review status</span>
              <Select
                onValueChange={(value: string) =>
                  onDraftChange({ ...draft, reviewStatus: value as KnowledgeItemReviewStatus })
                }
                value={draft.reviewStatus}
              >
                <SelectTrigger className="border-white/10 bg-slate-900 text-slate-50">
                  <SelectValue placeholder="Choose review status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending_review">Pending review</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={isPending} onClick={onSubmit}>
            {isPending ? "Saving..." : mode === "create" ? "Create knowledge item" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminKnowledgeItemsPage() {
  const viewer = useViewer();
  const queryClient = useQueryClient();
  const queryState = useAdminKnowledgeQueryState();
  const items = useKnowledgeItemsList(queryState.query);
  const pendingReview = useKnowledgeItemsList({
    page: 1,
    pageSize: 8,
    reviewStatus: "pending_review",
    search: undefined,
    sortBy: "updatedAt",
    sortDirection: "desc",
    source: "auto_generated",
    tab: "generate",
  });
  const generationHistory = useKnowledgeGenerateHistory();
  const store = useKnowledgeGenerateStore();
  const [message, setMessage] = useState(
    [
      "polite clarifying phrases for customer support calls",
      "turn-taking phrases for disagreeing politely in meetings",
      "softening language for making requests in restaurants",
    ].join("\n"),
  );
  const [shouldFail, setShouldFail] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formDraft, setFormDraft] = useState<KnowledgeItemFormDraft>(createEmptyKnowledgeItemDraft());
  const [formError, setFormError] = useState<string>();
  const [editingKnowledgeItemId, setEditingKnowledgeItemId] = useState<string>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [knowledgeItemToDelete, setKnowledgeItemToDelete] = useState<KnowledgeItem | null>(null);
  const batchItems = createSubmission(message, shouldFail);

  useEffect(() => {
    knowledgeGenerateStore.connect();

    return () => {
      knowledgeGenerateStore.disconnect();
    };
  }, []);

  const invalidateKnowledgeQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: knowledgeItemsQueryKey });
  };

  const saveKnowledgeItem = useMutation({
    mutationFn: async ({ draft, knowledgeItemId }: { draft: KnowledgeItemFormDraft; knowledgeItemId?: string }) => {
      const payload = parseKnowledgeItemDraft(draft);

      return knowledgeItemId
        ? apiJson(`/api/admin/knowledge-items/${knowledgeItemId}`, knowledgeItemSchema, {
            body: JSON.stringify(payload),
            method: "PATCH",
          })
        : apiJson("/api/admin/knowledge-items", knowledgeItemSchema, {
            body: JSON.stringify(payload),
            method: "POST",
          });
    },
    onSuccess: async () => {
      setFormError(undefined);
      setIsFormOpen(false);
      setEditingKnowledgeItemId(undefined);
      await invalidateKnowledgeQueries();
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "Could not save knowledge item.");
    },
  });

  const updateKnowledgeItemReviewStatus = useMutation({
    mutationFn: async ({
      knowledgeItemId,
      reviewStatus,
    }: {
      knowledgeItemId: string;
      reviewStatus: KnowledgeItemReviewStatus;
    }) => {
      return apiJson(`/api/admin/knowledge-items/${knowledgeItemId}`, knowledgeItemSchema, {
        body: JSON.stringify({ reviewStatus }),
        method: "PATCH",
      });
    },
    onSuccess: async () => {
      await invalidateKnowledgeQueries();
    },
  });

  const deleteKnowledgeItem = useMutation({
    mutationFn: async (knowledgeItemId: string) => {
      await apiVoid(`/api/admin/knowledge-items/${knowledgeItemId}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      setKnowledgeItemToDelete(null);
      await invalidateKnowledgeQueries();
    },
  });

  const openCreateDialog = () => {
    setFormMode("create");
    setEditingKnowledgeItemId(undefined);
    setFormDraft(createEmptyKnowledgeItemDraft());
    setFormError(undefined);
    setIsFormOpen(true);
  };

  const openEditDialog = (item: KnowledgeItem) => {
    setFormMode("edit");
    setEditingKnowledgeItemId(item.id);
    setFormDraft(createDraftFromKnowledgeItem(item));
    setFormError(undefined);
    setIsFormOpen(true);
  };

  const columns: ColumnDef<KnowledgeItem>[] = [
    {
      accessorKey: "pattern",
      cell: ({ row }) => (
        <div className="grid gap-1">
          <span className="font-medium text-slate-50">{row.original.pattern}</span>
          <span className="text-xs leading-6 text-slate-400">
            {ellipsize(row.original.example ?? "No example", 120)}
          </span>
        </div>
      ),
      header: "Pattern",
    },
    {
      accessorKey: "source",
      cell: ({ row }) => (
        <KnowledgeBadge tone={getSourceBadgeClassName(row.original.source)} value={row.original.source} />
      ),
      header: "Source",
    },
    {
      accessorKey: "reviewStatus",
      cell: ({ row }) => (
        <KnowledgeBadge tone={getReviewBadgeClassName(row.original.reviewStatus)} value={row.original.reviewStatus} />
      ),
      header: "Status",
    },
    {
      accessorFn: (row) =>
        [row.syntaxRole, row.fixednessLevel, row.communicativeFunction]
          .filter(Boolean)
          .map((value) => humanizeLabel(value))
          .join(" · "),
      id: "classification",
      enableSorting: false,
      header: "Classification",
    },
    {
      accessorKey: "updatedAt",
      cell: ({ row }) => <span className="text-sm text-slate-300">{formatTimestamp(row.original.updatedAt)}</span>,
      header: "Updated",
    },
    {
      cell: ({ row }) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={() => openEditDialog(row.original)} size="sm" variant="outline">
            Edit
          </Button>
          {row.original.reviewStatus !== "approved" ? (
            <Button
              disabled={updateKnowledgeItemReviewStatus.isPending}
              onClick={() =>
                void updateKnowledgeItemReviewStatus.mutateAsync({
                  knowledgeItemId: row.original.id,
                  reviewStatus: "approved",
                })
              }
              size="sm"
            >
              Approve
            </Button>
          ) : null}
          {row.original.reviewStatus !== "rejected" ? (
            <Button
              disabled={updateKnowledgeItemReviewStatus.isPending}
              onClick={() =>
                void updateKnowledgeItemReviewStatus.mutateAsync({
                  knowledgeItemId: row.original.id,
                  reviewStatus: "rejected",
                })
              }
              size="sm"
              variant="outline"
            >
              Reject
            </Button>
          ) : null}
          {row.original.reviewStatus !== "pending_review" ? (
            <Button
              disabled={updateKnowledgeItemReviewStatus.isPending}
              onClick={() =>
                void updateKnowledgeItemReviewStatus.mutateAsync({
                  knowledgeItemId: row.original.id,
                  reviewStatus: "pending_review",
                })
              }
              size="sm"
              variant="outline"
            >
              Requeue
            </Button>
          ) : null}
          <Button onClick={() => setKnowledgeItemToDelete(row.original)} size="sm" variant="outline">
            Delete
          </Button>
        </div>
      ),
      enableHiding: false,
      enableSorting: false,
      header: () => <div className="text-right">Actions</div>,
      id: "actions",
    },
  ];

  const sorting: SortingState = [{ desc: queryState.sortDirection === "desc", id: queryState.sortBy }];
  const totalPages = Math.max(items.data?.totalPages ?? 0, 1);

  return (
    <AdminGate>
      <div className="grid gap-8">
        <PageIntro
          badge="Admin Knowledge"
          description="Manage the curated knowledge catalog and route generated language items through a review queue before they become approved artifacts."
          title="Run knowledge-item moderation as a structured workflow."
          aside={
            <dl className="grid gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-200">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-400">Operator</dt>
                <dd>{viewer.data?.user?.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-400">Catalog size</dt>
                <dd>{items.data?.total ?? 0}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-400">Pending review</dt>
                <dd>{pendingReview.data?.total ?? 0}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-400">Generator connection</dt>
                <dd>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${connectionStyles[store.connectionState]}`}
                  >
                    {store.connectionState}
                  </span>
                </dd>
              </div>
            </dl>
          }
        />

        <Tabs
          onValueChange={(value: string) => queryState.setTab(value as "manage" | "generate")}
          value={queryState.tab}
        >
          <TabsList className="h-auto w-fit rounded-[20px] border border-white/10 bg-slate-950/60 p-1 text-slate-300">
            <TabsTrigger
              className="rounded-2xl px-4 py-2 data-[state=active]:bg-cyan-300/10 data-[state=active]:text-cyan-100"
              value="manage"
            >
              Knowledge Management
            </TabsTrigger>
            <TabsTrigger
              className="rounded-2xl px-4 py-2 data-[state=active]:bg-cyan-300/10 data-[state=active]:text-cyan-100"
              value="generate"
            >
              Bulk Generation
            </TabsTrigger>
          </TabsList>

          <TabsContent className="grid gap-6" value="manage">
            <Card className="grid gap-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="grid gap-2">
                  <h2 className="text-2xl text-white">Knowledge catalog</h2>
                  <p className="text-sm leading-7 text-slate-300">
                    Search, filter, review, and edit approved or pending knowledge items from the same table workflow.
                  </p>
                </div>
                <Button onClick={openCreateDialog}>Add knowledge item</Button>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_13rem_13rem]">
                <div className="grid gap-2 text-sm text-slate-300">
                  <span>Source</span>
                  <Select
                    onValueChange={(value: string) =>
                      queryState.setSource(value === "all" ? undefined : (value as KnowledgeItemSource))
                    }
                    value={queryState.source ?? "all"}
                  >
                    <SelectTrigger className="border-white/10 bg-slate-950/60 text-slate-50">
                      <SelectValue placeholder="All sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sources</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="auto_generated">Auto generated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 text-sm text-slate-300">
                  <span>Review status</span>
                  <Select
                    onValueChange={(value: string) =>
                      queryState.setReviewStatus(value === "all" ? undefined : (value as KnowledgeItemReviewStatus))
                    }
                    value={queryState.reviewStatus ?? "all"}
                  >
                    <SelectTrigger className="border-white/10 bg-slate-950/60 text-slate-50">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="pending_review">Pending review</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 text-sm text-slate-300">
                  <span>Moderation state</span>
                  <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-6 text-slate-400">
                    Generated items keep their source after approval. Review status, not source, controls moderation.
                  </div>
                </div>
              </div>

              {items.error ? (
                <PageState description={items.error.message} title="Could not load knowledge items" />
              ) : null}
              {!items.error ? (
                <DataTable
                  columns={columns}
                  data={items.data?.items ?? []}
                  globalFilter={queryState.search ?? ""}
                  isPending={items.isPending || saveKnowledgeItem.isPending || deleteKnowledgeItem.isPending}
                  onGlobalFilterChange={queryState.setSearch}
                  onSortingChange={(nextSorting: SortingState) => {
                    const nextColumn = nextSorting[0];

                    if (!nextColumn) {
                      return;
                    }

                    if (
                      nextColumn.id === "createdAt" ||
                      nextColumn.id === "pattern" ||
                      nextColumn.id === "reviewStatus" ||
                      nextColumn.id === "source" ||
                      nextColumn.id === "updatedAt"
                    ) {
                      queryState.setSort(nextColumn.id, nextColumn.desc ? "desc" : "asc");
                    }
                  }}
                  paginationMeta={{
                    limit: items.data?.pageSize ?? queryState.pageSize,
                    onLimitChange: queryState.setPageSize,
                    onPageChange: queryState.setPage,
                    page: items.data?.page ?? queryState.page,
                    pages: totalPages,
                    total: items.data?.total ?? 0,
                  }}
                  searchPlaceholder="Search by pattern or example"
                  sorting={sorting}
                />
              ) : null}
            </Card>
          </TabsContent>

          <TabsContent className="grid gap-6" value="generate">
            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <Card className="grid gap-5">
                <div className="grid gap-2">
                  <h2 className="text-2xl text-white">Bulk generation</h2>
                  <p className="text-sm leading-7 text-slate-300">
                    Queue one prompt per line. Completed jobs land in pending review instead of showing up as approved
                    items.
                  </p>
                </div>
                <Textarea
                  className="min-h-44 border-white/10 bg-slate-950/65 text-sm leading-7 text-slate-50"
                  onChange={(event) => setMessage(event.target.value)}
                  value={message}
                />
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                  <input
                    checked={shouldFail}
                    className="h-4 w-4 rounded border-white/20 bg-slate-900"
                    onChange={(event) => setShouldFail(event.target.checked)}
                    type="checkbox"
                  />
                  Simulate worker failure for this submission
                </label>
                {store.lastError ? <p className="text-sm text-rose-300">{store.lastError}</p> : null}
                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={store.submitState === "submitting" || batchItems.length === 0}
                    onClick={() => void knowledgeGenerateStore.submit(batchItems)}
                    size="lg"
                  >
                    {store.submitState === "submitting" ? "Submitting..." : `Queue ${batchItems.length} jobs`}
                  </Button>
                  <Button onClick={() => void pendingReview.refetch()} variant="outline">
                    Refresh review queue
                  </Button>
                  <Button onClick={() => void generationHistory.refetch()} variant="outline">
                    Refresh submission history
                  </Button>
                </div>
              </Card>

              <Card className="grid gap-4">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-2xl text-white">Live queue state</h2>
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {store.jobs.length} jobs tracked
                  </span>
                </div>
                <div className="grid gap-3">
                  {store.jobs.length ? (
                    store.jobs.map((job) => (
                      <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4" key={job.jobId}>
                        <div className="flex items-center justify-between gap-4">
                          <span className="max-w-[68%] truncate text-sm text-white">{job.message}</span>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${getJobStatusTone(job.status)}`}
                          >
                            {job.status}
                          </span>
                        </div>
                        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,rgba(34,197,94,0.7),rgba(56,189,248,0.95))] transition-[width] duration-500"
                            style={{ width: `${Math.max(job.progress, 4)}%` }}
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-4 text-xs text-slate-500">
                          <span>{job.progress}%</span>
                          <span>{formatClock(job.updatedAt)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
                      No queued jobs yet.
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <Card className="grid gap-5">
              <div className="flex items-center justify-between gap-4">
                <div className="grid gap-2">
                  <h2 className="text-2xl text-white">Recent submissions</h2>
                  <p className="text-sm leading-7 text-slate-300">
                    Revisit recent knowledge-generation batches after reload and reconnect the live stream for any
                    submission.
                  </p>
                </div>
                <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {generationHistory.data?.items.length ?? 0} tracked
                </span>
              </div>

              {generationHistory.error ? (
                <PageState description={generationHistory.error.message} title="Could not load submission history" />
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {generationHistory.data?.items.length ? (
                    generationHistory.data.items.map((submission) => (
                      <div
                        className="grid gap-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-5"
                        key={submission.id}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="grid gap-1">
                            <h3 className="text-lg text-white">Submission {ellipsize(submission.id, 18)}</h3>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                              {submission.totalCount} requested · updated {formatTimestamp(submission.updatedAt)}
                            </p>
                          </div>
                          <Button
                            onClick={() => knowledgeGenerateStore.connectToEventsUrl(submission.eventsUrl)}
                            size="sm"
                            variant="outline"
                          >
                            Reconnect stream
                          </Button>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-slate-300">
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                            {submission.summary.totalJobs} jobs
                          </span>
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-100">
                            {submission.summary.completed} completed
                          </span>
                          <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-amber-100">
                            {submission.summary.started} started
                          </span>
                          <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-sky-100">
                            {submission.summary.queued} queued
                          </span>
                          <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-rose-100">
                            {submission.summary.failed} failed
                          </span>
                        </div>

                        <div className="grid gap-3">
                          {submission.jobs.length ? (
                            submission.jobs.map((job) => (
                              <div
                                className="rounded-[18px] border border-white/10 bg-slate-950/55 p-4"
                                key={job.jobId}
                              >
                                <div className="flex items-center justify-between gap-4">
                                  <span className="max-w-[72%] truncate text-sm text-slate-100">{job.message}</span>
                                  <span
                                    className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${getJobStatusTone(job.status)}`}
                                  >
                                    {job.status}
                                  </span>
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-4 text-xs text-slate-500">
                                  <span>{job.progress}%</span>
                                  <span>{formatTimestamp(job.processedAt ?? job.queuedAt)}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-[18px] border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-500">
                              No persisted jobs for this submission yet.
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-500 lg:col-span-2">
                      {generationHistory.isPending
                        ? "Loading submission history..."
                        : "No recent knowledge-generation submissions yet."}
                    </div>
                  )}
                </div>
              )}
            </Card>

            <Card className="grid gap-5">
              <div className="flex items-center justify-between gap-4">
                <div className="grid gap-2">
                  <h2 className="text-2xl text-white">Pending review queue</h2>
                  <p className="text-sm leading-7 text-slate-300">
                    Generated knowledge items stay admin-only until an operator reviews and approves them.
                  </p>
                </div>
                <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {pendingReview.data?.total ?? 0} pending
                </span>
              </div>

              {pendingReview.error ? (
                <PageState description={pendingReview.error.message} title="Could not load the review queue" />
              ) : (
                <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.02]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead className="text-slate-300">Pattern</TableHead>
                        <TableHead className="text-slate-300">Submission</TableHead>
                        <TableHead className="text-slate-300">Updated</TableHead>
                        <TableHead className="text-right text-slate-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingReview.data?.items.length ? (
                        pendingReview.data.items.map((item) => (
                          <TableRow className="border-white/10" key={item.id}>
                            <TableCell>
                              <div className="grid gap-1">
                                <span className="font-medium text-slate-50">{item.pattern}</span>
                                <span className="text-xs leading-6 text-slate-400">
                                  {ellipsize(item.example ?? "No example", 110)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-slate-400">
                              {item.submissionId ? ellipsize(item.submissionId, 18) : "Manual"}
                            </TableCell>
                            <TableCell className="text-sm text-slate-400">{formatTimestamp(item.updatedAt)}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button onClick={() => openEditDialog(item)} size="sm" variant="outline">
                                  Review
                                </Button>
                                <Button
                                  disabled={updateKnowledgeItemReviewStatus.isPending}
                                  onClick={() =>
                                    void updateKnowledgeItemReviewStatus.mutateAsync({
                                      knowledgeItemId: item.id,
                                      reviewStatus: "approved",
                                    })
                                  }
                                  size="sm"
                                >
                                  Approve
                                </Button>
                                <Button
                                  disabled={updateKnowledgeItemReviewStatus.isPending}
                                  onClick={() =>
                                    void updateKnowledgeItemReviewStatus.mutateAsync({
                                      knowledgeItemId: item.id,
                                      reviewStatus: "rejected",
                                    })
                                  }
                                  size="sm"
                                  variant="outline"
                                >
                                  Reject
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow className="border-white/10">
                          <TableCell className="h-24 text-center text-slate-400" colSpan={4}>
                            {pendingReview.isPending
                              ? "Loading review queue..."
                              : "No knowledge items are waiting for review."}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <KnowledgeItemFormDialog
        draft={formDraft}
        error={formError}
        isPending={saveKnowledgeItem.isPending}
        mode={formMode}
        onDraftChange={setFormDraft}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setFormError(undefined);
          }
        }}
        onSubmit={() =>
          void saveKnowledgeItem.mutateAsync({ draft: formDraft, knowledgeItemId: editingKnowledgeItemId })
        }
        open={isFormOpen}
      />

      <AlertDialog
        onOpenChange={(open: boolean) => !open && setKnowledgeItemToDelete(null)}
        open={Boolean(knowledgeItemToDelete)}
      >
        <AlertDialogContent className="border-white/10 bg-slate-950 text-slate-50">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete knowledge item</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {knowledgeItemToDelete
                ? `Delete ${knowledgeItemToDelete.pattern}? This removes it from the admin knowledge catalog.`
                : "Delete this knowledge item?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent text-slate-100">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-500"
              onClick={() =>
                knowledgeItemToDelete ? void deleteKnowledgeItem.mutateAsync(knowledgeItemToDelete.id) : undefined
              }
            >
              {deleteKnowledgeItem.isPending ? "Deleting..." : "Delete knowledge item"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminGate>
  );
}
