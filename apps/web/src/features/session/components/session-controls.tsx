import { Button } from "@english-coach/ui";
import { useSessionRuntimeStore } from "../runtime/store";
import type { LiveSessionBootstrap } from "../types";

interface SessionControlsProps {
  bootstrap: LiveSessionBootstrap;
}

export function SessionControls({ bootstrap }: SessionControlsProps) {
  const setEndSessionDialogOpen = useSessionRuntimeStore((state) => state.setEndSessionDialogOpen);
  const setSidePanelOpen = useSessionRuntimeStore((state) => state.setSidePanelOpen);

  return (
    <section className="flex flex-col gap-3 rounded-[0.25rem] border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-slate-950">Live practice controls</p>
        <p className="mt-1 text-sm text-slate-600">
          Your microphone stays on while connected. End the room intentionally when you’re ready to wrap up.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button className="xl:hidden" onClick={() => setSidePanelOpen(true)} type="button" variant="outline">
          {bootstrap.sessionType === "role-play" ? "Open scenario" : "Open context"}
        </Button>
        <Button onClick={() => setEndSessionDialogOpen(true)} type="button" variant="outline">
          End Session
        </Button>
      </div>
    </section>
  );
}
