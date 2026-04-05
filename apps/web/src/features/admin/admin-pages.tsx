import { communicativeFunctions, fixednessLevels, syntaxRoles } from "@english-coach/contract";
import { Button, Input } from "@english-coach/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  adminScenariosQueryKey,
  apiJson,
  apiVoid,
  connectionStyles,
  createSubmission,
  ellipsize,
  formatClock,
  getJobStatusTone,
  humanizeLabel,
  type KnowledgeItem,
  knowledgeItemSchema,
  knowledgeItemsQueryKey,
  useAdminScenarios,
  useKnowledgeItemsList,
  useViewer,
} from "../../lib/app-data";
import { AdminGate, Card, LoadingPanel, PageIntro, PageState } from "../../lib/app-shell";
import { scenarioGenerateStore, useScenarioGenerateStore } from "../../lib/scenario-generate-store";

function useAdminScenarioQueryState() {
  const currentSearch = useSearch({ from: "/admin/scenarios" });
  const navigate = useNavigate({ from: "/admin/scenarios" });
  const [searchInput, setSearchInput] = useState(currentSearch.search ?? "");

  useEffect(() => {
    setSearchInput(currentSearch.search ?? "");
  }, [currentSearch.search]);

  useEffect(() => {
    const nextSearch = searchInput.trim() || undefined;

    if (nextSearch === currentSearch.search) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void navigate({
        replace: true,
        search: (previous) => ({ ...previous, page: 1, search: nextSearch }),
        to: "/admin/scenarios",
      });
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentSearch.search, navigate, searchInput]);

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
    searchInput,
    setPage: (page: number) => void navigate({ search: (previous) => ({ ...previous, page }), to: "/admin/scenarios" }),
    setPageSize: (pageSize: number) =>
      void navigate({ search: (previous) => ({ ...previous, page: 1, pageSize }), to: "/admin/scenarios" }),
    setSearchInput,
    setSortBy: (sortBy: "updatedAt" | "createdAt" | "title") =>
      void navigate({ search: (previous) => ({ ...previous, page: 1, sortBy }), to: "/admin/scenarios" }),
    setSortDirection: (sortDirection: "asc" | "desc") =>
      void navigate({ search: (previous) => ({ ...previous, page: 1, sortDirection }), to: "/admin/scenarios" }),
  };
}

function useAdminKnowledgeQueryState() {
  const currentSearch = useSearch({ from: "/admin/knowledge-items" });
  const navigate = useNavigate({ from: "/admin/knowledge-items" });
  const [searchInput, setSearchInput] = useState(currentSearch.search ?? "");

  useEffect(() => {
    setSearchInput(currentSearch.search ?? "");
  }, [currentSearch.search]);

  useEffect(() => {
    const nextSearch = searchInput.trim() || undefined;

    if (nextSearch === currentSearch.search) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void navigate({
        replace: true,
        search: (previous) => ({ ...previous, page: 1, search: nextSearch }),
        to: "/admin/knowledge-items",
      });
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentSearch.search, navigate, searchInput]);

  return {
    ...currentSearch,
    query: {
      page: currentSearch.page,
      pageSize: currentSearch.pageSize,
      search: currentSearch.search,
      sortBy: currentSearch.sortBy,
      sortDirection: currentSearch.sortDirection,
      source: currentSearch.source,
    },
    searchInput,
    setPage: (page: number) =>
      void navigate({ search: (previous) => ({ ...previous, page }), to: "/admin/knowledge-items" }),
    setPageSize: (pageSize: number) =>
      void navigate({
        search: (previous) => ({ ...previous, page: 1, pageSize }),
        to: "/admin/knowledge-items",
      }),
    setSearchInput,
    setSortBy: (sortBy: "updatedAt" | "createdAt" | "pattern" | "source") =>
      void navigate({
        search: (previous) => ({ ...previous, page: 1, sortBy }),
        to: "/admin/knowledge-items",
      }),
    setSortDirection: (sortDirection: "asc" | "desc") =>
      void navigate({
        search: (previous) => ({ ...previous, page: 1, sortDirection }),
        to: "/admin/knowledge-items",
      }),
    setSource: (source: "all" | "admin" | "auto_generated") =>
      void navigate({ search: (previous) => ({ ...previous, page: 1, source }), to: "/admin/knowledge-items" }),
  };
}

export function AdminScenarioPage() {
  const viewer = useViewer();
  const queryClient = useQueryClient();
  const queryState = useAdminScenarioQueryState();
  const scenarios = useAdminScenarios(queryState.query);
  const store = useScenarioGenerateStore();
  const [message, setMessage] = useState(
    [
      "Role-play a difficult customer call about a refund.",
      "Practice a tense salary negotiation with your manager.",
      "Handle a product demo with a skeptical enterprise buyer.",
    ].join("\n"),
  );
  const [shouldFail, setShouldFail] = useState(false);
  const batchItems = createSubmission(message, shouldFail);
  const deleteScenario = useMutation({
    mutationFn: async (scenarioId: string) => {
      await apiVoid(`/api/scenarios/${scenarioId}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminScenariosQueryKey });
    },
  });
  const totalPages = scenarios.data?.totalPages ?? 0;
  const canGoBack = queryState.page > 1;
  const canGoForward = totalPages === 0 ? false : queryState.page < totalPages;

  useEffect(() => {
    scenarioGenerateStore.connect();

    return () => {
      scenarioGenerateStore.disconnect();
    };
  }, []);

  return (
    <AdminGate>
      <div className="grid gap-8">
        <PageIntro
          badge="Admin Scenarios"
          description="Generate scenarios in batches over SSE, watch queue progress live, and manage the final scenario catalog from the same page."
          title="Control the practice library from a single scenario generation console."
          aside={
            <dl className="grid gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-200">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-400">Events URL</dt>
                <dd className="max-w-[65%] truncate text-right">{store.eventsUrl}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-400">Connection</dt>
                <dd>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${connectionStyles[store.connectionState]}`}
                  >
                    {store.connectionState}
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-400">Operator</dt>
                <dd>{viewer.data?.user?.email}</dd>
              </div>
            </dl>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Card className="grid gap-5">
            <div className="grid gap-2">
              <h2 className="text-2xl text-white">Generate more</h2>
              <p className="text-sm leading-7 text-slate-300">
                Enter one scenario prompt per line and queue the batch.
              </p>
            </div>
            <textarea
              className="min-h-44 rounded-[22px] border border-white/10 bg-slate-950/65 px-4 py-4 text-sm leading-7 text-slate-50 outline-none transition focus:border-cyan-300/40"
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
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={store.submitState === "submitting" || batchItems.length === 0}
                onClick={() => void scenarioGenerateStore.submit(batchItems)}
                size="lg"
              >
                {store.submitState === "submitting" ? "Submitting..." : `Queue ${batchItems.length} jobs`}
              </Button>
              <Button
                onClick={() => void queryClient.invalidateQueries({ queryKey: adminScenariosQueryKey })}
                variant="outline"
              >
                Refresh scenarios
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
            <h2 className="text-2xl text-white">Scenario catalog</h2>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {scenarios.data?.total ?? 0} scenarios
            </span>
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_12rem_10rem]">
            <div className="grid gap-2 text-sm text-slate-300">
              <span>Search scenarios</span>
              <Input
                aria-label="Search admin scenarios"
                className="border-white/10 bg-slate-950/60 text-slate-50"
                onChange={(event) => queryState.setSearchInput(event.target.value)}
                placeholder="Search by title or setting"
                value={queryState.searchInput}
              />
            </div>
            <div className="grid gap-2 text-sm text-slate-300">
              <span>Sort by</span>
              <select
                aria-label="Sort admin scenarios by"
                className="h-10 rounded-md border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-50 outline-none"
                onChange={(event) => queryState.setSortBy(event.target.value as typeof queryState.sortBy)}
                value={queryState.sortBy}
              >
                <option value="updatedAt">Recently updated</option>
                <option value="createdAt">Newest created</option>
                <option value="title">Title</option>
              </select>
            </div>
            <div className="grid gap-2 text-sm text-slate-300">
              <span>Direction</span>
              <select
                aria-label="Admin scenario sort direction"
                className="h-10 rounded-md border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-50 outline-none"
                onChange={(event) => queryState.setSortDirection(event.target.value as typeof queryState.sortDirection)}
                value={queryState.sortDirection}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
            <div className="grid gap-2 text-sm text-slate-300">
              <span>Page size</span>
              <select
                aria-label="Admin scenario page size"
                className="h-10 rounded-md border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-50 outline-none"
                onChange={(event) => queryState.setPageSize(Number(event.target.value))}
                value={String(queryState.pageSize)}
              >
                {[9, 18, 36].map((size) => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
              </select>
            </div>
          </div>
          {scenarios.isPending ? <LoadingPanel label="Loading scenarios..." /> : null}
          {scenarios.error ? (
            <PageState description={scenarios.error.message} title="Could not load scenarios" />
          ) : null}
          {scenarios.data?.items.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {scenarios.data.items.map((scenario) => (
                <div className="grid gap-4 rounded-[22px] border border-white/10 bg-white/[0.03] p-5" key={scenario.id}>
                  <div className="grid gap-2">
                    <h3 className="text-xl text-white">{scenario.title}</h3>
                    <p className="text-sm leading-7 text-slate-300">{ellipsize(scenario.setting, 150)}</p>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <span>{scenario.goals.goals.length} goals</span>
                    <span>{scenario.updatedAt.slice(0, 10)}</span>
                  </div>
                  <div className="flex gap-3">
                    <Button asChild variant="outline">
                      <Link params={{ scenarioId: scenario.id }} to="/scenarios/$scenarioId">
                        Preview
                      </Link>
                    </Button>
                    <Button
                      disabled={deleteScenario.isPending}
                      onClick={() => void deleteScenario.mutateAsync(scenario.id)}
                      variant="outline"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {scenarios.data?.items.length ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-slate-300">
              <span>
                Page {queryState.page} of {Math.max(totalPages, 1)} · {scenarios.data.total} scenarios
              </span>
              <div className="flex items-center gap-3">
                <Button disabled={!canGoBack} onClick={() => queryState.setPage(queryState.page - 1)} variant="outline">
                  Previous
                </Button>
                <Button disabled={!canGoForward} onClick={() => queryState.setPage(queryState.page + 1)}>
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </AdminGate>
  );
}

function KnowledgeItemRow({ item }: { item: KnowledgeItem }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<KnowledgeItem>(item);
  const saveMutation = useMutation({
    mutationFn: async (nextItem: KnowledgeItem) => {
      return apiJson(`/api/admin/knowledge-items/${nextItem.id}`, knowledgeItemSchema, {
        body: JSON.stringify({
          communicativeFunction: nextItem.communicativeFunction,
          example: nextItem.example,
          fixednessLevel: nextItem.fixednessLevel,
          pattern: nextItem.pattern,
          source: nextItem.source === "auto_generated" ? "admin" : nextItem.source,
          syntaxRole: nextItem.syntaxRole,
        }),
        method: "PATCH",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: knowledgeItemsQueryKey });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (knowledgeItemId: string) => {
      await apiVoid(`/api/admin/knowledge-items/${knowledgeItemId}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: knowledgeItemsQueryKey });
    },
  });

  useEffect(() => {
    setDraft(item);
  }, [item]);

  return (
    <tr className="border-t border-white/10 align-top">
      <td className="px-3 py-3">
        <textarea
          className="min-h-24 w-full rounded-xl border border-white/10 bg-slate-950/65 px-3 py-2 text-sm text-slate-50 outline-none"
          onChange={(event) => setDraft((current) => ({ ...current, pattern: event.target.value }))}
          value={draft.pattern}
        />
      </td>
      <td className="px-3 py-3">
        <select
          className="w-full rounded-xl border border-white/10 bg-slate-950/65 px-3 py-2 text-sm text-slate-50 outline-none"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              syntaxRole: event.target.value ? (event.target.value as KnowledgeItem["syntaxRole"]) : null,
            }))
          }
          value={draft.syntaxRole ?? ""}
        >
          <option value="">Unset</option>
          {syntaxRoles.map((value) => (
            <option key={value} value={value}>
              {humanizeLabel(value)}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3">
        <select
          className="w-full rounded-xl border border-white/10 bg-slate-950/65 px-3 py-2 text-sm text-slate-50 outline-none"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              fixednessLevel: event.target.value ? (event.target.value as KnowledgeItem["fixednessLevel"]) : null,
            }))
          }
          value={draft.fixednessLevel ?? ""}
        >
          <option value="">Unset</option>
          {fixednessLevels.map((value) => (
            <option key={value} value={value}>
              {humanizeLabel(value)}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3">
        <select
          className="w-full rounded-xl border border-white/10 bg-slate-950/65 px-3 py-2 text-sm text-slate-50 outline-none"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              communicativeFunction: event.target.value
                ? (event.target.value as KnowledgeItem["communicativeFunction"])
                : null,
            }))
          }
          value={draft.communicativeFunction ?? ""}
        >
          <option value="">Unset</option>
          {communicativeFunctions.map((value) => (
            <option key={value} value={value}>
              {humanizeLabel(value)}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3">
        <div className="grid gap-3">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-center text-xs uppercase tracking-[0.18em] text-slate-300">
            {draft.source}
          </span>
          <Button
            disabled={saveMutation.isPending}
            onClick={() => void saveMutation.mutateAsync(draft)}
            variant="outline"
          >
            {saveMutation.isPending ? "Saving..." : draft.source === "auto_generated" ? "Promote + save" : "Save"}
          </Button>
          <Button
            disabled={deleteMutation.isPending}
            onClick={() => void deleteMutation.mutateAsync(draft.id)}
            variant="outline"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function AdminKnowledgeItemsPage() {
  const queryClient = useQueryClient();
  const queryState = useAdminKnowledgeQueryState();
  const [newItem, setNewItem] = useState({
    communicativeFunction: "" as string,
    example: "",
    fixednessLevel: "" as string,
    pattern: "",
    syntaxRole: "" as string,
  });
  const items = useKnowledgeItemsList(queryState.query);
  const totalPages = items.data?.totalPages ?? 0;
  const canGoBack = queryState.page > 1;
  const canGoForward = totalPages === 0 ? false : queryState.page < totalPages;
  const createMutation = useMutation({
    mutationFn: async () => {
      return apiJson("/api/admin/knowledge-items", knowledgeItemSchema, {
        body: JSON.stringify({
          communicativeFunction: newItem.communicativeFunction || null,
          example: newItem.example.trim() || null,
          fixednessLevel: newItem.fixednessLevel || null,
          pattern: newItem.pattern.trim(),
          syntaxRole: newItem.syntaxRole || null,
        }),
        method: "POST",
      });
    },
    onSuccess: async () => {
      setNewItem({ communicativeFunction: "", example: "", fixednessLevel: "", pattern: "", syntaxRole: "" });
      await queryClient.invalidateQueries({ queryKey: knowledgeItemsQueryKey });
    },
  });

  return (
    <AdminGate>
      <div className="grid gap-8">
        <PageIntro
          badge="Admin Knowledge"
          description="Review automatically extracted language patterns, classify them, and promote approved items into the curated admin vocabulary set."
          title="Maintain the phrase inventory the learner sees after each session."
        />

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="grid gap-4">
            <h2 className="text-2xl text-white">Create item</h2>
            <textarea
              className="min-h-28 rounded-[22px] border border-white/10 bg-slate-950/65 px-4 py-4 text-sm leading-7 text-slate-50 outline-none"
              onChange={(event) => setNewItem((current) => ({ ...current, pattern: event.target.value }))}
              placeholder="Pattern, e.g. I'd like <np>"
              value={newItem.pattern}
            />
            <textarea
              className="min-h-24 rounded-[22px] border border-white/10 bg-slate-950/65 px-4 py-4 text-sm leading-7 text-slate-50 outline-none"
              onChange={(event) => setNewItem((current) => ({ ...current, example: event.target.value }))}
              placeholder="Example sentence"
              value={newItem.example}
            />
            <div className="grid gap-3 md:grid-cols-3">
              <select
                className="rounded-xl border border-white/10 bg-slate-950/65 px-3 py-2 text-sm text-slate-50 outline-none"
                onChange={(event) => setNewItem((current) => ({ ...current, syntaxRole: event.target.value }))}
                value={newItem.syntaxRole}
              >
                <option value="">Syntax role</option>
                {syntaxRoles.map((value) => (
                  <option key={value} value={value}>
                    {humanizeLabel(value)}
                  </option>
                ))}
              </select>
              <select
                className="rounded-xl border border-white/10 bg-slate-950/65 px-3 py-2 text-sm text-slate-50 outline-none"
                onChange={(event) => setNewItem((current) => ({ ...current, fixednessLevel: event.target.value }))}
                value={newItem.fixednessLevel}
              >
                <option value="">Fixedness</option>
                {fixednessLevels.map((value) => (
                  <option key={value} value={value}>
                    {humanizeLabel(value)}
                  </option>
                ))}
              </select>
              <select
                className="rounded-xl border border-white/10 bg-slate-950/65 px-3 py-2 text-sm text-slate-50 outline-none"
                onChange={(event) =>
                  setNewItem((current) => ({ ...current, communicativeFunction: event.target.value }))
                }
                value={newItem.communicativeFunction}
              >
                <option value="">Function</option>
                {communicativeFunctions.map((value) => (
                  <option key={value} value={value}>
                    {humanizeLabel(value)}
                  </option>
                ))}
              </select>
            </div>
            <Button
              disabled={!newItem.pattern.trim() || createMutation.isPending}
              onClick={() => void createMutation.mutateAsync()}
              size="lg"
            >
              {createMutation.isPending ? "Creating..." : "Add knowledge item"}
            </Button>
          </Card>

          <Card className="grid gap-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl text-white">Review queue</h2>
              <span className="text-xs uppercase tracking-[0.18em] text-slate-500">{items.data?.total ?? 0} items</span>
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_12rem_12rem_10rem]">
              <div className="grid gap-2 text-sm text-slate-300">
                <span>Search items</span>
                <Input
                  aria-label="Search knowledge items"
                  className="border-white/10 bg-slate-950/60 text-slate-50"
                  onChange={(event) => queryState.setSearchInput(event.target.value)}
                  placeholder="Search pattern or example"
                  value={queryState.searchInput}
                />
              </div>
              <div className="grid gap-2 text-sm text-slate-300">
                <span>Source</span>
                <select
                  aria-label="Filter knowledge items by source"
                  className="h-10 rounded-md border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-50 outline-none"
                  onChange={(event) => queryState.setSource(event.target.value as typeof queryState.source)}
                  value={queryState.source}
                >
                  <option value="all">All sources</option>
                  <option value="auto_generated">Auto-generated</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="grid gap-2 text-sm text-slate-300">
                <span>Sort by</span>
                <select
                  aria-label="Sort knowledge items by"
                  className="h-10 rounded-md border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-50 outline-none"
                  onChange={(event) => queryState.setSortBy(event.target.value as typeof queryState.sortBy)}
                  value={queryState.sortBy}
                >
                  <option value="updatedAt">Recently updated</option>
                  <option value="createdAt">Newest created</option>
                  <option value="pattern">Pattern</option>
                  <option value="source">Source</option>
                </select>
              </div>
              <div className="grid gap-2 text-sm text-slate-300">
                <span>Direction</span>
                <select
                  aria-label="Knowledge item sort direction"
                  className="h-10 rounded-md border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-50 outline-none"
                  onChange={(event) =>
                    queryState.setSortDirection(event.target.value as typeof queryState.sortDirection)
                  }
                  value={queryState.sortDirection}
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
              <div className="grid gap-2 text-sm text-slate-300">
                <span>Page size</span>
                <select
                  aria-label="Knowledge item page size"
                  className="h-10 rounded-md border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-50 outline-none"
                  onChange={(event) => queryState.setPageSize(Number(event.target.value))}
                  value={String(queryState.pageSize)}
                >
                  {[10, 20, 50].map((size) => (
                    <option key={size} value={size}>
                      {size} per page
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {items.isPending ? <LoadingPanel label="Loading knowledge items..." /> : null}
            {items.error ? (
              <PageState description={items.error.message} title="Could not load knowledge items" />
            ) : null}
            {items.data?.items.length ? (
              <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm text-slate-200">
                    <thead className="bg-white/[0.04] text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      <tr>
                        <th className="px-3 py-3 font-medium">Pattern</th>
                        <th className="px-3 py-3 font-medium">Syntax</th>
                        <th className="px-3 py-3 font-medium">Fixedness</th>
                        <th className="px-3 py-3 font-medium">Function</th>
                        <th className="px-3 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.data.items.map((item) => (
                        <KnowledgeItemRow item={item} key={item.id} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
            {items.data?.items.length ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-slate-300">
                <span>
                  Page {queryState.page} of {Math.max(totalPages, 1)} · {items.data.total} items
                </span>
                <div className="flex items-center gap-3">
                  <Button
                    disabled={!canGoBack}
                    onClick={() => queryState.setPage(queryState.page - 1)}
                    variant="outline"
                  >
                    Previous
                  </Button>
                  <Button disabled={!canGoForward} onClick={() => queryState.setPage(queryState.page + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </AdminGate>
  );
}
