import { RoomAudioRenderer, SessionProvider, type UseSessionReturn } from "@livekit/components-react";
import type { ReactNode } from "react";

export function AgentSessionProvider({ children, session }: { children: ReactNode; session: UseSessionReturn }) {
  return (
    <SessionProvider session={session}>
      {children}
      <RoomAudioRenderer />
    </SessionProvider>
  );
}
