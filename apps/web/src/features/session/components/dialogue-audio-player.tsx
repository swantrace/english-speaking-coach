import type { DialogueAudio, SessionProcessingSnapshot } from "@english-coach/contract/session";
import { Alert, AlertDescription } from "@english-coach/ui";
import { usePrivateMediaAccess } from "@/components/media/use-private-media-access";

interface DialogueAudioPlayerProps {
  audio: DialogueAudio | null;
  processing: SessionProcessingSnapshot | null;
}

export function DialogueAudioPlayer({ audio, processing }: DialogueAudioPlayerProps) {
  const access = usePrivateMediaAccess(audio?.assetId ?? null);
  const status = processing?.dialogueAudioStatus;

  if (status === "failed") {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {processing?.dialogueAudioError || "The corrected dialogue audio could not be prepared."}
        </AlertDescription>
      </Alert>
    );
  }

  if (!audio || status === "queued" || status === "processing") {
    return <p className="text-sm text-slate-500">The corrected conversation is still being prepared.</p>;
  }

  if (access.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>The private audio link could not be loaded. Please try again.</AlertDescription>
      </Alert>
    );
  }

  if (!access.data) {
    return <p className="text-sm text-slate-500">Preparing secure audio playback…</p>;
  }

  return (
    <div className="space-y-3">
      <audio className="w-full" controls preload="metadata" src={access.data.url}>
        <track kind="captions" />
      </audio>
      <p className="text-xs text-slate-500">
        This version uses the refined learner turns and the coach’s original replies. Your original recording is not
        stored.
      </p>
    </div>
  );
}
