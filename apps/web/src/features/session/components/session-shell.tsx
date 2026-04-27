import { useMemo } from "react";
import {
  mapRecentHints,
  mapTranscriptTurnViews,
  selectGoalProgress,
  selectHints,
  selectTranscriptTurns,
} from "../runtime/selectors";
import { useSessionRuntimeStore } from "../runtime/store";
import type { LiveSessionBootstrap } from "../types";
import { ConnectionBanner } from "./connection-banner";
import { SessionControls } from "./session-controls";
import { SessionHeader } from "./session-header";
import { SessionSidePanel } from "./session-side-panel";
import { SessionTextComposer } from "./session-text-composer";
import { TranscriptPane } from "./transcript-pane";

interface SessionShellProps {
  bootstrap: LiveSessionBootstrap;
}

export function SessionShell({ bootstrap }: SessionShellProps) {
  const rawTurns = useSessionRuntimeStore(selectTranscriptTurns);
  const hints = useSessionRuntimeStore(selectHints);
  const goalProgress = useSessionRuntimeStore(selectGoalProgress);
  const turns = useMemo(() => mapTranscriptTurnViews({ hints, turns: rawTurns }), [hints, rawTurns]);
  const recentHints = useMemo(() => mapRecentHints({ hints }), [hints]);

  return (
    <div className="space-y-5">
      <SessionHeader bootstrap={bootstrap} />
      <ConnectionBanner />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
        <div className="space-y-5">
          <TranscriptPane turns={turns} />
          <SessionTextComposer />
          <SessionControls bootstrap={bootstrap} />
        </div>

        <SessionSidePanel bootstrap={bootstrap} goalProgress={goalProgress} hints={recentHints} />
      </div>
    </div>
  );
}
