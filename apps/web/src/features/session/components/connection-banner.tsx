import { Badge, cn } from "@english-coach/ui";
import { SessionStartAudioButton } from "../livekit/components-adapter";
import { selectConnectionBannerState } from "../runtime/selectors";
import { useSessionRuntimeStore } from "../runtime/store";

const statusCopy = {
  connected: "Audio is flowing and the coach is live in the room.",
  connecting: "Joining the LiveKit room and enabling your microphone.",
  disconnected: "The room is disconnected. You may need to retry or end the session cleanly.",
  error: "The live room hit an error before the session could fully connect.",
  reconnecting: "Connection dipped for a moment. We’re reconnecting to keep the practice going.",
} as const;

const statusBadgeClassNames = {
  connected: "border-emerald-200 bg-emerald-50 text-emerald-700",
  connecting: "border-amber-200 bg-amber-50 text-amber-700",
  disconnected: "border-stone-200 bg-stone-50 text-stone-700",
  error: "border-red-200 bg-red-50 text-red-700",
  reconnecting: "border-sky-200 bg-sky-50 text-sky-700",
} as const;

export function ConnectionBanner() {
  const { error, status } = useSessionRuntimeStore(selectConnectionBannerState);

  return (
    <section className="flex flex-col gap-3 rounded-[1.5rem] border border-stone-200 bg-stone-50/80 px-4 py-3 shadow-xs sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Badge className={cn("border capitalize shadow-none", statusBadgeClassNames[status])} variant="outline">
          {status}
        </Badge>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-950">{statusCopy[status]}</p>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </div>

      <SessionStartAudioButton className="self-start sm:self-auto" />
    </section>
  );
}
