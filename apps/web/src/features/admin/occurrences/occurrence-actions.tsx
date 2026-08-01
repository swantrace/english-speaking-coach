import { ArrowUpRight, Button, Link2, OctagonX, Sparkles } from "@english-coach/ui";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { LinkExistingDialog } from "./link-existing-dialog";
import {
  createOccurrenceMutationError,
  useEnrichOccurrenceMutation,
  useLinkOccurrenceMutation,
  useRejectOccurrenceMutation,
} from "./mutations";
import type { ProposedOccurrenceListItemView } from "./types";

interface OccurrenceActionsProps {
  occurrence: ProposedOccurrenceListItemView;
}

export function OccurrenceActions({ occurrence }: OccurrenceActionsProps) {
  const navigate = useNavigate();
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const linkMutation = useLinkOccurrenceMutation();
  const enrichMutation = useEnrichOccurrenceMutation();
  const rejectMutation = useRejectOccurrenceMutation();
  const isPending = enrichMutation.isPending || linkMutation.isPending || rejectMutation.isPending;
  const draftIsComplete = Boolean(occurrence.proposedPatternType && occurrence.proposedSenses?.length);

  if (occurrence.status !== "proposed") {
    return <span className="text-sm text-slate-500">Review complete</span>;
  }

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          className="shadow-none"
          disabled={isPending}
          onClick={() => setIsLinkDialogOpen(true)}
          size="sm"
          type="button"
          variant="default"
        >
          <Link2 />
          Link existing
        </Button>
        {draftIsComplete ? (
          <Button
            className="shadow-none"
            disabled={isPending}
            onClick={() =>
              void navigate({
                search: {
                  occurrenceId: occurrence.id,
                  pattern: occurrence.proposedPattern,
                },
                to: "/admin/knowledge/new",
              })
            }
            size="sm"
            type="button"
            variant="outline"
          >
            <ArrowUpRight />
            Review draft
          </Button>
        ) : (
          <Button
            className="shadow-none"
            disabled={isPending}
            onClick={() => enrichMutation.mutate(occurrence.id)}
            size="sm"
            type="button"
            variant="outline"
          >
            <Sparkles />
            {enrichMutation.isPending ? "Queuing…" : "Generate draft"}
          </Button>
        )}
        <Button disabled={isPending} onClick={() => setIsRejectOpen(true)} size="sm" type="button" variant="ghost">
          <OctagonX />
          Reject
        </Button>
      </div>

      <LinkExistingDialog
        isPending={linkMutation.isPending}
        onConfirm={async (knowledgeItemId) => {
          try {
            await linkMutation.mutateAsync({
              knowledgeItemId,
              occurrenceId: occurrence.id,
            });
            setIsLinkDialogOpen(false);
          } catch (error) {
            throw new Error(createOccurrenceMutationError(error, "We couldn't link this occurrence.").message);
          }
        }}
        onOpenChange={setIsLinkDialogOpen}
        open={isLinkDialogOpen}
        pattern={occurrence.proposedPattern}
      />

      <ConfirmDialog
        confirmLabel="Reject occurrence"
        description="This marks the proposed occurrence as rejected and removes it from the default review queue."
        errorMessage={rejectMutation.error ? rejectMutation.error.message : null}
        isPending={rejectMutation.isPending}
        onConfirm={async () => {
          try {
            await rejectMutation.mutateAsync(occurrence.id);
            setIsRejectOpen(false);
          } catch (error) {
            throw new Error(createOccurrenceMutationError(error, "We couldn't reject this occurrence.").message);
          }
        }}
        onOpenChange={setIsRejectOpen}
        open={isRejectOpen}
        title="Reject this occurrence?"
      />
    </>
  );
}
