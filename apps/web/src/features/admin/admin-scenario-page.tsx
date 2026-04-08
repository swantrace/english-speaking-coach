import { type Scenario, type ScenarioReviewStatus, scenarioSchema } from "@english-coach/contract";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@english-coach/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import {
  adminScenariosQueryKey,
  apiJson,
  apiVoid,
  connectionStyles,
  createSubmission,
  scenariosQueryKey,
  useAdminScenarios,
  useViewer,
} from "../../lib/app-data";
import { AdminGate, LoadingPanel, PageIntro } from "../../lib/app-shell";
import { scenarioGenerateStore, useScenarioGenerateStore } from "../../lib/scenario-generate-store";
import { useAdminScenarioQueryState } from "./admin-scenario-query-state";
import {
  createDraftFromScenario,
  createEmptyScenarioDraft,
  parseScenarioDraft,
  type ScenarioFormDraft,
} from "./admin-scenario-types";

const AdminScenarioGenerateTab = lazy(() =>
  import("./admin-scenario-generate-tab").then((module) => ({ default: module.AdminScenarioGenerateTab })),
);
const AdminScenarioManageTab = lazy(() =>
  import("./admin-scenario-manage-tab").then((module) => ({ default: module.AdminScenarioManageTab })),
);
const DeleteScenarioDialog = lazy(() =>
  import("./delete-scenario-dialog").then((module) => ({ default: module.DeleteScenarioDialog })),
);
const ScenarioFormDialog = lazy(() =>
  import("./scenario-form-dialog").then((module) => ({ default: module.ScenarioFormDialog })),
);

function AdminTabFallback() {
  return <LoadingPanel label="Loading admin tools..." />;
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
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formDraft, setFormDraft] = useState<ScenarioFormDraft>(createEmptyScenarioDraft());
  const [formError, setFormError] = useState<string>();
  const [editingScenarioId, setEditingScenarioId] = useState<string>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [scenarioToDelete, setScenarioToDelete] = useState<Scenario | null>(null);
  const batchItems = createSubmission(message);

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

  return (
    <AdminGate>
      <div className="grid gap-8">
        <PageIntro
          badge="Admin Scenarios"
          description="Manage approved and pending scenarios from one review surface, while bulk generation feeds a moderated review queue instead of publishing directly to learners."
          title="Run scenario operations as a review workflow, not a direct publish pipe."
          aside={
            <dl className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50/90 p-5 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Operator</dt>
                <dd>{viewer.data?.user?.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Catalog size</dt>
                <dd>{scenarios.data?.total ?? 0}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Pending review</dt>
                <dd>{pendingReview.data?.total ?? 0}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Generator connection</dt>
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
          <TabsList className="h-auto w-fit rounded-[20px] border border-slate-200 bg-white/90 p-1 text-slate-600 shadow-sm">
            <TabsTrigger
              className="rounded-2xl px-4 py-2 data-[state=active]:border data-[state=active]:border-amber-200 data-[state=active]:bg-amber-100 data-[state=active]:text-slate-900"
              value="manage"
            >
              Scenario Management
            </TabsTrigger>
            <TabsTrigger
              className="rounded-2xl px-4 py-2 data-[state=active]:border data-[state=active]:border-amber-200 data-[state=active]:bg-amber-100 data-[state=active]:text-slate-900"
              value="generate"
            >
              Bulk Generation
            </TabsTrigger>
          </TabsList>

          <TabsContent className="grid gap-6" value="manage">
            <Suspense fallback={<AdminTabFallback />}>
              <AdminScenarioManageTab
                isDeletePending={deleteScenario.isPending}
                isReviewStatusPending={updateScenarioReviewStatus.isPending}
                isSavePending={saveScenario.isPending}
                onDelete={setScenarioToDelete}
                onOpenCreate={openCreateDialog}
                onOpenEdit={openEditDialog}
                onPreview={(scenario) =>
                  void navigate({ params: { scenarioId: scenario.id }, to: "/scenarios/$scenarioId" })
                }
                onReviewStatusChange={(scenarioId, reviewStatus) =>
                  void updateScenarioReviewStatus.mutateAsync({ reviewStatus, scenarioId })
                }
                queryState={queryState}
                scenarios={scenarios}
              />
            </Suspense>
          </TabsContent>

          <TabsContent className="grid gap-6" value="generate">
            <Suspense fallback={<AdminTabFallback />}>
              <AdminScenarioGenerateTab
                batchCount={batchItems.length}
                message={message}
                onApprovePendingReview={(scenario) =>
                  void updateScenarioReviewStatus.mutateAsync({ reviewStatus: "approved", scenarioId: scenario.id })
                }
                onMessageChange={setMessage}
                onOpenPendingReview={openEditDialog}
                onRefreshPendingReview={() => void pendingReview.refetch()}
                onRejectPendingReview={(scenario) =>
                  void updateScenarioReviewStatus.mutateAsync({ reviewStatus: "rejected", scenarioId: scenario.id })
                }
                onSubmitBatch={() => void scenarioGenerateStore.submit(batchItems)}
                pendingReview={pendingReview}
                reviewMutationPending={updateScenarioReviewStatus.isPending}
                store={store}
              />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>

      <Suspense fallback={null}>
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

        <DeleteScenarioDialog
          isPending={deleteScenario.isPending}
          onConfirm={(scenarioId) => void deleteScenario.mutateAsync(scenarioId)}
          onOpenChange={(open) => !open && setScenarioToDelete(null)}
          scenario={scenarioToDelete}
        />
      </Suspense>
    </AdminGate>
  );
}
