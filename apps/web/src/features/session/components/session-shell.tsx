import { selectGoalProgress, selectRecentHints, selectTranscriptTurns } from "../runtime/selectors";
import { useSessionRuntimeStore } from "../runtime/store";
import type { LiveSessionBootstrap } from "../types";
import { ConnectionBanner } from "./connection-banner";
import { SessionControls } from "./session-controls";
import { SessionHeader } from "./session-header";
import { SessionSidePanel } from "./session-side-panel";
import { TranscriptPane } from "./transcript-pane";

interface SessionShellProps {
  bootstrap: LiveSessionBootstrap;
}

export function SessionShell({ bootstrap }: SessionShellProps) {
  const turns = useSessionRuntimeStore(selectTranscriptTurns);
  const recentHints = useSessionRuntimeStore(selectRecentHints);
  const goalProgress = useSessionRuntimeStore(selectGoalProgress);

  return (
    <div className="space-y-5">
      <SessionHeader bootstrap={bootstrap} />
      <ConnectionBanner />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
        <div className="space-y-5">
          <TranscriptPane turns={turns} />
          <SessionControls bootstrap={bootstrap} />
        </div>

        <SessionSidePanel bootstrap={bootstrap} goalProgress={goalProgress} hints={recentHints} />
      </div>
    </div>
  );
}
