import { useSession } from "@livekit/components-react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ConnectionState, TokenSource } from "livekit-client";
import { lazy, Suspense, startTransition, useEffect, useMemo, useRef, useState } from "react";
import { AgentSessionProvider } from "../../components/agents-ui/agent-session-provider";
import { liveKitUrl } from "../../lib/app-data";
import { AuthGate, LoadingPanel, PageState } from "../../lib/app-shell";
import { resetGoalProgress, resetObservations } from "../../lib/livekit-packet-stores";
import { getSessionLaunchSnapshot, removeSessionLaunchSnapshot } from "../../lib/session-launch-store";
import { SessionPacketBridge } from "./session-packet-bridge";

const SessionCenter = lazy(() => import("./session-center").then((module) => ({ default: module.SessionCenter })));
const MissionSidebar = lazy(() => import("./session-sidebars").then((module) => ({ default: module.MissionSidebar })));
const ObservationsSidebar = lazy(() =>
  import("./session-sidebars").then((module) => ({ default: module.ObservationsSidebar })),
);

function SessionRailFallback() {
  return <LoadingPanel label="Loading session context..." />;
}

function SessionCenterFallback() {
  return <LoadingPanel label="Loading session UI..." />;
}

export function SessionExperience({
  roomName,
  serverUrl,
  snapshot,
}: {
  roomName: string;
  serverUrl: string;
  snapshot: NonNullable<ReturnType<typeof getSessionLaunchSnapshot>>;
}) {
  const navigate = useNavigate();
  const [startError, setStartError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const tokenSource = useMemo(
    () =>
      TokenSource.literal({
        participantToken: snapshot.token,
        serverUrl,
      }),
    [serverUrl, snapshot.token],
  );
  const session = useSession(tokenSource);
  const startSession = session.start;
  const endSession = session.end;

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    const startTimeout = window.setTimeout(() => {
      void startSession({ signal: abortController.signal })
        .then(() => {
          if (!isMounted || abortController.signal.aborted) {
            return;
          }

          startedRef.current = true;
          setStartError(null);
        })
        .catch((error: unknown) => {
          if (!isMounted || abortController.signal.aborted) {
            return;
          }

          setStartError(error instanceof Error ? error.message : "Failed to start the LiveKit session");
        });
    }, 0);

    return () => {
      isMounted = false;
      abortController.abort();
      window.clearTimeout(startTimeout);
      void endSession().catch(() => {
        // Ignore shutdown errors during navigation.
      });
    };
  }, [endSession, startSession]);

  useEffect(() => {
    if (session.connectionState !== ConnectionState.Disconnected || !startedRef.current) {
      return;
    }

    removeSessionLaunchSnapshot(roomName);
    resetGoalProgress(roomName);
    resetObservations(roomName);
    startTransition(() => {
      void navigate({
        replace: true,
        search: { page: 1, pageSize: 10, sortBy: "startedAt", sortDirection: "desc" },
        to: "/history",
      });
    });
  }, [navigate, roomName, session.connectionState]);

  if (startError) {
    return <PageState description={startError} title="Could not start the voice session" />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
      <AgentSessionProvider session={session}>
        <SessionPacketBridge room={session.room} roomName={roomName} snapshot={snapshot} />
        <Suspense fallback={<SessionCenterFallback />}>
          <SessionCenter roomName={roomName} />
        </Suspense>
        <Suspense fallback={<SessionRailFallback />}>
          {snapshot.sessionType === "role-play" && snapshot.scenario ? (
            <MissionSidebar
              roomName={roomName}
              scenario={snapshot.scenario}
              selectedCharacterIndex={snapshot.selectedCharacterIndex}
            />
          ) : (
            <ObservationsSidebar contextDocument={snapshot.contextDocument} roomName={roomName} />
          )}
        </Suspense>
      </AgentSessionProvider>
    </div>
  );
}

export function SessionPage() {
  const { roomName } = useParams({ from: "/session/$roomName" });
  const snapshot = getSessionLaunchSnapshot(roomName);

  if (!snapshot) {
    return (
      <AuthGate>
        <PageState
          description="The room launch snapshot is missing. Start a new practice session from a scenario or history page."
          title="Session context not found"
        />
      </AuthGate>
    );
  }

  if (!liveKitUrl) {
    return (
      <AuthGate>
        <PageState
          description="Set VITE_LIVEKIT_URL for the web app so the client can connect to the room URL that matches the minted token."
          title="LiveKit URL is not configured"
        />
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <SessionExperience roomName={roomName} serverUrl={liveKitUrl} snapshot={snapshot} />
    </AuthGate>
  );
}
