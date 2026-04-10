import { type KnowledgeItem, knowledgeItemSchema } from "@english-coach/contract";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@english-coach/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useState } from "react";
import {
  apiJson,
  apiVoid,
  connectionStyles,
  createSubmission,
  knowledgeItemsQueryKey,
  useKnowledgeGenerateHistory,
  useKnowledgeItemsList,
  useViewer,
} from "../../lib/app-data";
import { AdminGate, LoadingPanel, PageIntro } from "../../lib/app-shell";
import { knowledgeGenerateStore, useKnowledgeGenerateStore } from "../../lib/knowledge-generate-store";
import { useAdminKnowledgeQueryState } from "./admin-knowledge-query-state";
import {
  createDraftFromKnowledgeItem,
  createEmptyKnowledgeItemDraft,
  type KnowledgeItemFormDraft,
  parseKnowledgeItemDraft,
} from "./admin-knowledge-types";

const AdminKnowledgeGenerateTab = lazy(() =>
  import("./admin-knowledge-generate-tab").then((module) => ({ default: module.AdminKnowledgeGenerateTab })),
);
const AdminKnowledgeManageTab = lazy(() =>
  import("./admin-knowledge-manage-tab").then((module) => ({ default: module.AdminKnowledgeManageTab })),
);
const DeleteKnowledgeItemDialog = lazy(() =>
  import("./delete-knowledge-item-dialog").then((module) => ({ default: module.DeleteKnowledgeItemDialog })),
);
const KnowledgeItemFormDialog = lazy(() =>
  import("./knowledge-item-form-dialog").then((module) => ({ default: module.KnowledgeItemFormDialog })),
);

function AdminKnowledgeFallback() {
  return <LoadingPanel label="Loading admin tools..." />;
}

export function AdminKnowledgeItemsPage() {
  const viewer = useViewer();
  const queryClient = useQueryClient();
  const queryState = useAdminKnowledgeQueryState();
  const items = useKnowledgeItemsList(queryState.query);
  // Pending-review tracking is temporarily disabled while the knowledge-item schema is simplified.
  const generationHistory = useKnowledgeGenerateHistory();
  const store = useKnowledgeGenerateStore();
  const [message, setMessage] = useState(
    [
      "polite clarifying phrases for customer support calls",
      "turn-taking phrases for disagreeing politely in meetings",
      "softening language for making requests in restaurants",
    ].join("\n"),
  );
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formDraft, setFormDraft] = useState<KnowledgeItemFormDraft>(createEmptyKnowledgeItemDraft());
  const [formError, setFormError] = useState<string>();
  const [editingKnowledgeItemId, setEditingKnowledgeItemId] = useState<string>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [knowledgeItemToDelete, setKnowledgeItemToDelete] = useState<KnowledgeItem | null>(null);
  const batchItems = createSubmission(message);

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

  // Review-status mutations are temporarily disabled while the knowledge-item schema is simplified.

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

  return (
    <AdminGate>
      <div className="grid gap-8">
        <PageIntro
          badge="Admin Knowledge"
          description="Manage the curated knowledge catalog and route generated language items through a review queue before they become approved artifacts."
          title="Run knowledge-item moderation as a structured workflow."
          aside={
            <dl className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50/90 p-5 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Operator</dt>
                <dd>{viewer.data?.user?.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Catalog size</dt>
                <dd>{items.data?.total ?? 0}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Pending review</dt>
                <dd>Temporarily hidden</dd>
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
              Knowledge Management
            </TabsTrigger>
            <TabsTrigger
              className="rounded-2xl px-4 py-2 data-[state=active]:border data-[state=active]:border-amber-200 data-[state=active]:bg-amber-100 data-[state=active]:text-slate-900"
              value="generate"
            >
              Bulk Generation
            </TabsTrigger>
          </TabsList>

          <TabsContent className="grid gap-6" value="manage">
            <Suspense fallback={<AdminKnowledgeFallback />}>
              <AdminKnowledgeManageTab
                isDeletePending={deleteKnowledgeItem.isPending}
                isSavePending={saveKnowledgeItem.isPending}
                items={items}
                onDelete={setKnowledgeItemToDelete}
                onOpenCreate={openCreateDialog}
                onOpenEdit={openEditDialog}
                queryState={queryState}
              />
            </Suspense>
          </TabsContent>

          <TabsContent className="grid gap-6" value="generate">
            <Suspense fallback={<AdminKnowledgeFallback />}>
              <AdminKnowledgeGenerateTab
                batchCount={batchItems.length}
                generationHistory={generationHistory}
                message={message}
                onMessageChange={setMessage}
                onReconnectStream={(eventsUrl) => knowledgeGenerateStore.connectToEventsUrl(eventsUrl)}
                onRefreshGenerationHistory={() => void generationHistory.refetch()}
                onSubmitBatch={() => void knowledgeGenerateStore.submit(batchItems)}
                store={store}
              />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>

      <Suspense fallback={null}>
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

        <DeleteKnowledgeItemDialog
          isPending={deleteKnowledgeItem.isPending}
          knowledgeItem={knowledgeItemToDelete}
          onConfirm={(knowledgeItemId) => void deleteKnowledgeItem.mutateAsync(knowledgeItemId)}
          onOpenChange={(open) => !open && setKnowledgeItemToDelete(null)}
        />
      </Suspense>
    </AdminGate>
  );
}
