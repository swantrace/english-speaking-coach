import { type KnowledgeItem, type KnowledgeItemReviewStatus, knowledgeItemSchema } from "@english-coach/contract";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@english-coach/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
import { AdminGate, PageIntro } from "../../lib/app-shell";
import { knowledgeGenerateStore, useKnowledgeGenerateStore } from "../../lib/knowledge-generate-store";
import { AdminKnowledgeGenerateTab } from "./admin-knowledge-generate-tab";
import { AdminKnowledgeManageTab } from "./admin-knowledge-manage-tab";
import { useAdminKnowledgeQueryState } from "./admin-knowledge-query-state";
import {
  createDraftFromKnowledgeItem,
  createEmptyKnowledgeItemDraft,
  type KnowledgeItemFormDraft,
  parseKnowledgeItemDraft,
} from "./admin-knowledge-types";
import { DeleteKnowledgeItemDialog } from "./delete-knowledge-item-dialog";
import { KnowledgeItemFormDialog } from "./knowledge-item-form-dialog";

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
            <AdminKnowledgeManageTab
              isDeletePending={deleteKnowledgeItem.isPending}
              isReviewStatusPending={updateKnowledgeItemReviewStatus.isPending}
              isSavePending={saveKnowledgeItem.isPending}
              items={items}
              onDelete={setKnowledgeItemToDelete}
              onOpenCreate={openCreateDialog}
              onOpenEdit={openEditDialog}
              onReviewStatusChange={(knowledgeItemId, reviewStatus) =>
                void updateKnowledgeItemReviewStatus.mutateAsync({ knowledgeItemId, reviewStatus })
              }
              queryState={queryState}
            />
          </TabsContent>

          <TabsContent className="grid gap-6" value="generate">
            <AdminKnowledgeGenerateTab
              batchCount={batchItems.length}
              generationHistory={generationHistory}
              message={message}
              onApprovePendingReview={(item) =>
                void updateKnowledgeItemReviewStatus.mutateAsync({ knowledgeItemId: item.id, reviewStatus: "approved" })
              }
              onMessageChange={setMessage}
              onOpenPendingReview={openEditDialog}
              onReconnectStream={(eventsUrl) => knowledgeGenerateStore.connectToEventsUrl(eventsUrl)}
              onRejectPendingReview={(item) =>
                void updateKnowledgeItemReviewStatus.mutateAsync({ knowledgeItemId: item.id, reviewStatus: "rejected" })
              }
              onRefreshGenerationHistory={() => void generationHistory.refetch()}
              onRefreshPendingReview={() => void pendingReview.refetch()}
              onShouldFailChange={setShouldFail}
              onSubmitBatch={() => void knowledgeGenerateStore.submit(batchItems)}
              pendingReview={pendingReview}
              reviewMutationPending={updateKnowledgeItemReviewStatus.isPending}
              shouldFail={shouldFail}
              store={store}
            />
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

      <DeleteKnowledgeItemDialog
        isPending={deleteKnowledgeItem.isPending}
        knowledgeItem={knowledgeItemToDelete}
        onConfirm={(knowledgeItemId) => void deleteKnowledgeItem.mutateAsync(knowledgeItemId)}
        onOpenChange={(open) => !open && setKnowledgeItemToDelete(null)}
      />
    </AdminGate>
  );
}
