import { type Scenario, type ScenarioReviewStatus, type ScenarioSource, scenarioSchema } from "@english-coach/contract";
import { adminScenarioCreateSchema } from "@english-coach/contract/scenario-generate";
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
  Input,
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
  adminScenariosQueryKey,
  apiJson,
  apiVoid,
  connectionStyles,
  createSubmission,
  ellipsize,
  formatClock,
  formatTimestamp,
  getJobStatusTone,
  humanizeLabel,
  scenariosQueryKey,
  useAdminScenarios,
  useViewer,
} from "../../lib/app-data";
import { AdminGate, Card, PageIntro, PageState } from "../../lib/app-shell";
import { scenarioGenerateStore, useScenarioGenerateStore } from "../../lib/scenario-generate-store";

type ScenarioFormDraft = {
  charactersJson: string;
  exampleDialogueJson: string;
  goalsJson: string;
  reviewStatus: ScenarioReviewStatus;
  setting: string;
  title: string;
};

function toPrettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function createEmptyScenarioDraft(): ScenarioFormDraft {
  return {
    charactersJson: toPrettyJson([
      { description: "The learner's role in the scene.", name: "Learner" },
      { description: "The scene partner the agent will play.", name: "Partner" },
    ]),
    exampleDialogueJson: toPrettyJson([
      { speaker: "agent", text: "Hello. How can I help you today?" },
      { speaker: "user", text: "I need help with this situation." },
    ]),
    goalsJson: toPrettyJson({
      goals: [
        {
          description: "State the main request clearly",
          id: "state-request",
          logic: { required_intents: ["state_request"], required_slots: ["request_detail"] },
        },
      ],
      intents: ["state_request"],
      slots: ["request_detail"],
    }),
    reviewStatus: "approved",
    setting: "",
    title: "",
  };
}

function createDraftFromScenario(scenario: Scenario): ScenarioFormDraft {
  return {
    charactersJson: toPrettyJson(scenario.characters),
    exampleDialogueJson: toPrettyJson(scenario.exampleDialogue),
    goalsJson: toPrettyJson(scenario.goals),
    reviewStatus: scenario.reviewStatus,
    setting: scenario.setting,
    title: scenario.title,
  };
}

function parseScenarioDraft(draft: ScenarioFormDraft) {
  let characters: unknown;
  let exampleDialogue: unknown;
  let goals: unknown;

  try {
    characters = JSON.parse(draft.charactersJson);
  } catch {
    throw new Error("Characters must be valid JSON.");
  }

  try {
    exampleDialogue = JSON.parse(draft.exampleDialogueJson);
  } catch {
    throw new Error("Example dialogue must be valid JSON.");
  }

  try {
    goals = JSON.parse(draft.goalsJson);
  } catch {
    throw new Error("Goals must be valid JSON.");
  }

  const parsedDraft = adminScenarioCreateSchema.safeParse({
    characters,
    exampleDialogue,
    goals,
    reviewStatus: draft.reviewStatus,
    setting: draft.setting,
    title: draft.title,
  });

  if (!parsedDraft.success) {
    throw new Error(parsedDraft.error.issues[0]?.message ?? "Scenario form is invalid.");
  }

  return parsedDraft.data;
}

function getReviewBadgeClassName(reviewStatus: ScenarioReviewStatus) {
  if (reviewStatus === "approved") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  }

  if (reviewStatus === "rejected") {
    return "border-rose-400/30 bg-rose-400/10 text-rose-100";
  }

  return "border-amber-400/30 bg-amber-400/10 text-amber-100";
}

function getSourceBadgeClassName(source: ScenarioSource) {
  if (source === "admin") {
    return "border-cyan-400/30 bg-cyan-400/10 text-cyan-100";
  }

  return "border-violet-400/30 bg-violet-400/10 text-violet-100";
}

function ScenarioBadge({ tone, value }: { tone: string; value: string }) {
  return (
    <Badge className={tone} variant="outline">
      {humanizeLabel(value)}
    </Badge>
  );
}

function useAdminScenarioQueryState() {
  const currentSearch = useSearch({ from: "/admin/scenarios" });
  const navigate = useNavigate({ from: "/admin/scenarios" });

  const updateSearch = (updater: (previous: typeof currentSearch) => typeof currentSearch) => {
    void navigate({ search: updater, to: "/admin/scenarios" });
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
    setReviewStatus: (reviewStatus?: ScenarioReviewStatus) =>
      updateSearch((previous) => ({ ...previous, page: 1, reviewStatus })),
    setSearch: (search?: string) =>
      updateSearch((previous) => ({ ...previous, page: 1, search: search?.trim() || undefined })),
    setSort: (sortBy: "updatedAt" | "createdAt" | "title", sortDirection: "asc" | "desc") =>
      updateSearch((previous) => ({ ...previous, page: 1, sortBy, sortDirection })),
    setSource: (source?: ScenarioSource) => updateSearch((previous) => ({ ...previous, page: 1, source })),
    setTab: (tab: "manage" | "generate") => updateSearch((previous) => ({ ...previous, tab })),
  };
}

function ScenarioFormDialog({
  draft,
  error,
  isPending,
  mode,
  onDraftChange,
  onOpenChange,
  onSubmit,
  open,
}: {
  draft: ScenarioFormDraft;
  error?: string;
  isPending: boolean;
  mode: "create" | "edit";
  onDraftChange: (draft: ScenarioFormDraft) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-4xl border-white/10 bg-slate-950 text-slate-50">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create scenario" : "Edit scenario"}</DialogTitle>
          <DialogDescription className="text-slate-400">
            Scenario definitions stay structured. Characters, goals, and example dialogue use JSON so admin edits remain
            lossless.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2 text-sm text-slate-200">
            <span>Title</span>
            <Input
              className="border-white/10 bg-slate-900 text-slate-50"
              onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
              value={draft.title}
            />
          </div>
          <div className="grid gap-2 text-sm text-slate-200">
            <span>Review status</span>
            <Select
              onValueChange={(value: string) =>
                onDraftChange({ ...draft, reviewStatus: value as ScenarioReviewStatus })
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
          <div className="grid gap-2 text-sm text-slate-200 md:col-span-2">
            <span>Setting</span>
            <Textarea
              className="min-h-24 border-white/10 bg-slate-900 text-slate-50"
              onChange={(event) => onDraftChange({ ...draft, setting: event.target.value })}
              value={draft.setting}
            />
          </div>
          <div className="grid gap-2 text-sm text-slate-200">
            <span>Characters JSON</span>
            <Textarea
              className="min-h-56 border-white/10 bg-slate-900 font-mono text-xs text-slate-50"
              onChange={(event) => onDraftChange({ ...draft, charactersJson: event.target.value })}
              value={draft.charactersJson}
            />
          </div>
          <div className="grid gap-2 text-sm text-slate-200">
            <span>Goals JSON</span>
            <Textarea
              className="min-h-56 border-white/10 bg-slate-900 font-mono text-xs text-slate-50"
              onChange={(event) => onDraftChange({ ...draft, goalsJson: event.target.value })}
              value={draft.goalsJson}
            />
          </div>
          <div className="grid gap-2 text-sm text-slate-200 md:col-span-2">
            <span>Example dialogue JSON</span>
            <Textarea
              className="min-h-52 border-white/10 bg-slate-900 font-mono text-xs text-slate-50"
              onChange={(event) => onDraftChange({ ...draft, exampleDialogueJson: event.target.value })}
              value={draft.exampleDialogueJson}
            />
          </div>
        </div>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={isPending} onClick={onSubmit}>
            {isPending ? "Saving..." : mode === "create" ? "Create scenario" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminScenarioPage() {
  const viewer = useViewer();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const queryState = useAdminScenarioQueryState();
  const scenarios = useAdminScenarios(queryState.query);
  const pendingReview = useAdminScenarios({
    page: 1,
    pageSize: 8,
    reviewStatus: "pending_review",
    search: undefined,
    sortBy: "updatedAt",
    sortDirection: "desc",
    source: "auto_generated",
    tab: "generate",
  });
  const store = useScenarioGenerateStore();
  const [message, setMessage] = useState(
    [
      "Role-play a difficult customer call about a refund.",
      "Practice a tense salary negotiation with your manager.",
      "Handle a product demo with a skeptical enterprise buyer.",
    ].join("\n"),
  );
  const [shouldFail, setShouldFail] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formDraft, setFormDraft] = useState<ScenarioFormDraft>(createEmptyScenarioDraft());
  const [formError, setFormError] = useState<string>();
  const [editingScenarioId, setEditingScenarioId] = useState<string>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [scenarioToDelete, setScenarioToDelete] = useState<Scenario | null>(null);
  const batchItems = createSubmission(message, shouldFail);

  useEffect(() => {
    scenarioGenerateStore.connect();

    return () => {
      scenarioGenerateStore.disconnect();
    };
  }, []);

  const invalidateScenarioQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminScenariosQueryKey }),
      queryClient.invalidateQueries({ queryKey: scenariosQueryKey }),
    ]);
  };

  const saveScenario = useMutation({
    mutationFn: async ({ draft, scenarioId }: { draft: ScenarioFormDraft; scenarioId?: string }) => {
      const payload = parseScenarioDraft(draft);

      return scenarioId
        ? apiJson(`/api/admin/scenarios/${scenarioId}`, scenarioSchema, {
            body: JSON.stringify(payload),
            method: "PATCH",
          })
        : apiJson("/api/admin/scenarios", scenarioSchema, {
            body: JSON.stringify(payload),
            method: "POST",
          });
    },
    onSuccess: async () => {
      setFormError(undefined);
      setIsFormOpen(false);
      setEditingScenarioId(undefined);
      await invalidateScenarioQueries();
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "Could not save scenario.");
    },
  });

  const updateScenarioReviewStatus = useMutation({
    mutationFn: async ({ reviewStatus, scenarioId }: { reviewStatus: ScenarioReviewStatus; scenarioId: string }) => {
      return apiJson(`/api/admin/scenarios/${scenarioId}`, scenarioSchema, {
        body: JSON.stringify({ reviewStatus }),
        method: "PATCH",
      });
    },
    onSuccess: async () => {
      await invalidateScenarioQueries();
    },
  });

  const deleteScenario = useMutation({
    mutationFn: async (scenarioId: string) => {
      await apiVoid(`/api/admin/scenarios/${scenarioId}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      setScenarioToDelete(null);
      await invalidateScenarioQueries();
    },
  });

  const openCreateDialog = () => {
    setFormMode("create");
    setEditingScenarioId(undefined);
    setFormDraft(createEmptyScenarioDraft());
    setFormError(undefined);
    setIsFormOpen(true);
  };

  const openEditDialog = (scenario: Scenario) => {
    setFormMode("edit");
    setEditingScenarioId(scenario.id);
    setFormDraft(createDraftFromScenario(scenario));
    setFormError(undefined);
    setIsFormOpen(true);
  };

  const columns: ColumnDef<Scenario>[] = [
    {
      accessorKey: "title",
      cell: ({ row }) => (
        <div className="grid gap-1">
          <span className="font-medium text-slate-50">{row.original.title}</span>
          <span className="text-xs leading-6 text-slate-400">{ellipsize(row.original.setting, 120)}</span>
        </div>
      ),
      header: "Title",
    },
    {
      accessorKey: "source",
      cell: ({ row }) => (
        <ScenarioBadge tone={getSourceBadgeClassName(row.original.source)} value={row.original.source} />
      ),
      enableSorting: false,
      header: "Source",
    },
    {
      accessorKey: "reviewStatus",
      cell: ({ row }) => (
        <ScenarioBadge tone={getReviewBadgeClassName(row.original.reviewStatus)} value={row.original.reviewStatus} />
      ),
      enableSorting: false,
      header: "Status",
    },
    {
      accessorFn: (row) => row.goals.goals.length,
      id: "goalCount",
      enableSorting: false,
      header: "Goals",
    },
    {
      accessorKey: "updatedAt",
      cell: ({ row }) => <span className="text-sm text-slate-300">{formatTimestamp(row.original.updatedAt)}</span>,
      header: "Updated",
    },
    {
      cell: ({ row }) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            onClick={() => void navigate({ params: { scenarioId: row.original.id }, to: "/scenarios/$scenarioId" })}
            size="sm"
            variant="outline"
          >
            Preview
          </Button>
          <Button onClick={() => openEditDialog(row.original)} size="sm" variant="outline">
            Edit
          </Button>
          {row.original.reviewStatus !== "approved" ? (
            <Button
              disabled={updateScenarioReviewStatus.isPending}
              onClick={() =>
                void updateScenarioReviewStatus.mutateAsync({ reviewStatus: "approved", scenarioId: row.original.id })
              }
              size="sm"
            >
              Approve
            </Button>
          ) : null}
          {row.original.reviewStatus !== "rejected" ? (
            <Button
              disabled={updateScenarioReviewStatus.isPending}
              onClick={() =>
                void updateScenarioReviewStatus.mutateAsync({ reviewStatus: "rejected", scenarioId: row.original.id })
              }
              size="sm"
              variant="outline"
            >
              Reject
            </Button>
          ) : null}
          {row.original.reviewStatus !== "pending_review" ? (
            <Button
              disabled={updateScenarioReviewStatus.isPending}
              onClick={() =>
                void updateScenarioReviewStatus.mutateAsync({
                  reviewStatus: "pending_review",
                  scenarioId: row.original.id,
                })
              }
              size="sm"
              variant="outline"
            >
              Requeue
            </Button>
          ) : null}
          <Button onClick={() => setScenarioToDelete(row.original)} size="sm" variant="outline">
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
  const totalPages = Math.max(scenarios.data?.totalPages ?? 0, 1);

  return (
    <AdminGate>
      <div className="grid gap-8">
        <PageIntro
          badge="Admin Scenarios"
          description="Manage approved and pending scenarios from one review surface, while bulk generation feeds a moderated review queue instead of publishing directly to learners."
          title="Run scenario operations as a review workflow, not a direct publish pipe."
          aside={
            <dl className="grid gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-200">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-400">Operator</dt>
                <dd>{viewer.data?.user?.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-400">Catalog size</dt>
                <dd>{scenarios.data?.total ?? 0}</dd>
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
              Scenario Management
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
                  <h2 className="text-2xl text-white">Scenario catalog</h2>
                  <p className="text-sm leading-7 text-slate-300">
                    Search, filter, review, and edit scenarios without leaving the table workflow.
                  </p>
                </div>
                <Button onClick={openCreateDialog}>Add scenario</Button>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_13rem_13rem]">
                <div className="grid gap-2 text-sm text-slate-300">
                  <span>Source</span>
                  <Select
                    onValueChange={(value: string) =>
                      queryState.setSource(value === "all" ? undefined : (value as ScenarioSource))
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
                      queryState.setReviewStatus(value === "all" ? undefined : (value as ScenarioReviewStatus))
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
                    Approved scenarios are learner-visible. Pending and rejected scenarios stay admin-only.
                  </div>
                </div>
              </div>

              {scenarios.error ? (
                <PageState description={scenarios.error.message} title="Could not load scenarios" />
              ) : null}
              {!scenarios.error ? (
                <DataTable
                  columns={columns}
                  data={scenarios.data?.items ?? []}
                  globalFilter={queryState.search ?? ""}
                  isPending={scenarios.isPending || saveScenario.isPending || deleteScenario.isPending}
                  onGlobalFilterChange={queryState.setSearch}
                  onSortingChange={(nextSorting: SortingState) => {
                    const nextColumn = nextSorting[0];

                    if (!nextColumn) {
                      return;
                    }

                    if (nextColumn.id === "createdAt" || nextColumn.id === "title" || nextColumn.id === "updatedAt") {
                      queryState.setSort(nextColumn.id, nextColumn.desc ? "desc" : "asc");
                    }
                  }}
                  paginationMeta={{
                    limit: scenarios.data?.pageSize ?? queryState.pageSize,
                    onLimitChange: queryState.setPageSize,
                    onPageChange: queryState.setPage,
                    page: scenarios.data?.page ?? queryState.page,
                    pages: totalPages,
                    total: scenarios.data?.total ?? 0,
                  }}
                  searchPlaceholder="Search by title or setting"
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
                    Queue one prompt per line. Completed jobs now land in pending review instead of publishing directly.
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
                    onClick={() => void scenarioGenerateStore.submit(batchItems)}
                    size="lg"
                  >
                    {store.submitState === "submitting" ? "Submitting..." : `Queue ${batchItems.length} jobs`}
                  </Button>
                  <Button onClick={() => void pendingReview.refetch()} variant="outline">
                    Refresh review queue
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
                  <h2 className="text-2xl text-white">Pending review queue</h2>
                  <p className="text-sm leading-7 text-slate-300">
                    Generated scenarios remain hidden from learners until an admin approves them.
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
                        <TableHead className="text-slate-300">Scenario</TableHead>
                        <TableHead className="text-slate-300">Submission</TableHead>
                        <TableHead className="text-slate-300">Updated</TableHead>
                        <TableHead className="text-right text-slate-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingReview.data?.items.length ? (
                        pendingReview.data.items.map((scenario) => (
                          <TableRow className="border-white/10" key={scenario.id}>
                            <TableCell>
                              <div className="grid gap-1">
                                <span className="font-medium text-slate-50">{scenario.title}</span>
                                <span className="text-xs leading-6 text-slate-400">
                                  {ellipsize(scenario.setting, 110)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-slate-400">
                              {scenario.submissionId ? ellipsize(scenario.submissionId, 18) : "Manual"}
                            </TableCell>
                            <TableCell className="text-sm text-slate-400">
                              {formatTimestamp(scenario.updatedAt)}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button onClick={() => openEditDialog(scenario)} size="sm" variant="outline">
                                  Review
                                </Button>
                                <Button
                                  disabled={updateScenarioReviewStatus.isPending}
                                  onClick={() =>
                                    void updateScenarioReviewStatus.mutateAsync({
                                      reviewStatus: "approved",
                                      scenarioId: scenario.id,
                                    })
                                  }
                                  size="sm"
                                >
                                  Approve
                                </Button>
                                <Button
                                  disabled={updateScenarioReviewStatus.isPending}
                                  onClick={() =>
                                    void updateScenarioReviewStatus.mutateAsync({
                                      reviewStatus: "rejected",
                                      scenarioId: scenario.id,
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
                              : "No scenarios are waiting for review."}
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

      <ScenarioFormDialog
        draft={formDraft}
        error={formError}
        isPending={saveScenario.isPending}
        mode={formMode}
        onDraftChange={setFormDraft}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setFormError(undefined);
          }
        }}
        onSubmit={() => void saveScenario.mutateAsync({ draft: formDraft, scenarioId: editingScenarioId })}
        open={isFormOpen}
      />

      <AlertDialog
        onOpenChange={(open: boolean) => !open && setScenarioToDelete(null)}
        open={Boolean(scenarioToDelete)}
      >
        <AlertDialogContent className="border-white/10 bg-slate-950 text-slate-50">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete scenario</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {scenarioToDelete
                ? `Delete ${scenarioToDelete.title}? This removes it from admin management and learner browsing.`
                : "Delete this scenario?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent text-slate-100">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-500"
              onClick={() => (scenarioToDelete ? void deleteScenario.mutateAsync(scenarioToDelete.id) : undefined)}
            >
              {deleteScenario.isPending ? "Deleting..." : "Delete scenario"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminGate>
  );
}
