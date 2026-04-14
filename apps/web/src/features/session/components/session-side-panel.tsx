import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@english-coach/ui";
import { useSessionRuntimeStore } from "../runtime/store";
import type { LiveSessionBootstrap, SessionGoalProgress, SessionHint } from "../types";
import { FreeformSideContent } from "./freeform-side-content";
import { HintList } from "./hint-list";
import { RoleplaySideContent } from "./roleplay-side-content";

interface SessionSidePanelProps {
  bootstrap: LiveSessionBootstrap;
  goalProgress: SessionGoalProgress | null;
  hints: SessionHint[];
}

function SessionSidePanelBody({ bootstrap, goalProgress, hints }: SessionSidePanelProps) {
  return (
    <div className="space-y-5">
      {bootstrap.sessionType === "role-play" ? (
        <RoleplaySideContent goalProgress={goalProgress} scenario={bootstrap.scenario} />
      ) : (
        <FreeformSideContent context={bootstrap.context} />
      )}

      <section className="rounded-[1.5rem] border border-stone-200 bg-white p-4 shadow-xs">
        <p className="text-sm font-semibold text-slate-950">Recent hints</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Hints stay attached to transcript turns when possible and also remain visible here for quick review.
        </p>
        <div className="mt-4">
          <HintList hints={hints} />
        </div>
      </section>
    </div>
  );
}

export function SessionSidePanel(props: SessionSidePanelProps) {
  const sidePanelOpen = useSessionRuntimeStore((state) => state.sidePanelOpen);
  const setSidePanelOpen = useSessionRuntimeStore((state) => state.setSidePanelOpen);

  return (
    <>
      <aside className="hidden xl:block">
        <SessionSidePanelBody {...props} />
      </aside>

      <Dialog onOpenChange={setSidePanelOpen} open={sidePanelOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {props.bootstrap.sessionType === "role-play" ? "Scenario panel" : "Context panel"}
            </DialogTitle>
            <DialogDescription>
              Keep the supporting context nearby while the transcript and hints continue updating in real time.
            </DialogDescription>
          </DialogHeader>
          <SessionSidePanelBody {...props} />
        </DialogContent>
      </Dialog>
    </>
  );
}
