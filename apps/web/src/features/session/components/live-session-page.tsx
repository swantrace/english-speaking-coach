import { Alert, AlertDescription, Button } from "@english-coach/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { mapLiveSessionPageViewModel } from "../mappers";
import { useEndSessionMutation } from "../mutations";
import { useSessionRuntimeStore } from "../runtime/store";
import type { LiveSessionBootstrap } from "../types";
import { EndSessionDialog } from "./end-session-dialog";
import { SessionRuntimeController } from "./session-runtime-controller";
import { SessionShell } from "./session-shell";

interface LiveSessionPageProps {
  bootstrap: LiveSessionBootstrap;
}

export function LiveSessionPage({ bootstrap }: LiveSessionPageProps) {
  const navigate = useNavigate();
  const [endSessionError, setEndSessionError] = useState<string | null>(null);
  const viewModel = useMemo(() => mapLiveSessionPageViewModel(bootstrap), [bootstrap]);
  const setEndSessionDialogOpen = useSessionRuntimeStore((state) => state.setEndSessionDialogOpen);
  const endSessionMutation = useEndSessionMutation(bootstrap.sessionId, {
    onSuccess: async () => {
      setEndSessionDialogOpen(false);
      await navigate({
        params: viewModel.detailRoute.params,
        replace: true,
        to: viewModel.detailRoute.to,
      });
    },
  });

  async function handleConfirmEndSession() {
    setEndSessionError(null);

    try {
      await endSessionMutation.mutateAsync();
    } catch (error) {
      setEndSessionError(error instanceof Error ? error.message : "We couldn't end the session yet. Please try again.");
    }
  }

  if (bootstrap.endedAt) {
    return (
      <section className="space-y-6 rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Session Complete</p>
          <h1 className="text-3xl text-slate-950">{viewModel.title}</h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            This live room has already been closed. You can continue from the session detail view instead of
            reconnecting.
          </p>
        </div>
        <Button asChild>
          <Link params={viewModel.detailRoute.params} to={viewModel.detailRoute.to}>
            Open session detail
          </Link>
        </Button>
      </section>
    );
  }

  return (
    <SessionRuntimeController bootstrap={bootstrap}>
      <div className="space-y-6">
        {endSessionError ? (
          <Alert variant="destructive">
            <AlertDescription>{endSessionError}</AlertDescription>
          </Alert>
        ) : null}

        <SessionShell bootstrap={bootstrap} />

        <EndSessionDialog
          errorMessage={endSessionMutation.error?.message ?? null}
          isPending={endSessionMutation.isPending}
          onConfirm={() => void handleConfirmEndSession()}
        />
      </div>
    </SessionRuntimeController>
  );
}
