import { Alert, AlertDescription, Badge, Button, ChevronLeft, ChevronRight, Volume2 } from "@english-coach/ui";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { LoadingState } from "@/components/app/loading-state";
import { PageHeader } from "@/components/app/page-header";
import { PageSection } from "@/components/app/page-section";
import { privateMediaAccessQueryOptions, usePrivateMediaAccess } from "@/components/media/use-private-media-access";
import { formatDate } from "@/lib/dates";
import { useConversationPlaylistQuery } from "../queries";

type RepeatMode = "all" | "off" | "one";

function formatDuration(durationMs: number) {
  const totalSeconds = Math.round(durationMs / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function ConversationPlaylistPage() {
  const playlistQuery = useConversationPlaylistQuery();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("all");
  const [continuePlaying, setContinuePlaying] = useState(false);
  const items = playlistQuery.data?.items ?? [];
  const current = items[currentIndex] ?? null;
  const access = usePrivateMediaAccess(current?.assetId ?? null);

  const nextIndex = useMemo(() => {
    if (items.length === 0) return null;
    if (currentIndex + 1 < items.length) return currentIndex + 1;
    return repeatMode === "all" ? 0 : null;
  }, [currentIndex, items.length, repeatMode]);

  useEffect(() => {
    if (currentIndex >= items.length && items.length > 0) {
      setCurrentIndex(0);
    }
  }, [currentIndex, items.length]);

  useEffect(() => {
    const next = nextIndex === null ? null : items[nextIndex];
    if (next && next.assetId !== current?.assetId) {
      void queryClient.prefetchQuery(privateMediaAccessQueryOptions(next.assetId));
    }
  }, [current?.assetId, items, nextIndex, queryClient]);

  useEffect(() => {
    if (!continuePlaying || !access.data?.url || !audioRef.current) return;
    audioRef.current.play().catch(() => setContinuePlaying(false));
    setContinuePlaying(false);
  }, [access.data?.url, continuePlaying]);

  function selectItem(index: number, autoplay = false) {
    setContinuePlaying(autoplay);
    setCurrentIndex(index);
  }

  function handleEnded() {
    if (repeatMode === "one" && audioRef.current) {
      audioRef.current.currentTime = 0;
      void audioRef.current.play();
      return;
    }
    if (nextIndex !== null) {
      selectItem(nextIndex, true);
    }
  }

  if (playlistQuery.isPending) {
    return (
      <LoadingState description="We’re loading your corrected role-play conversations." title="Loading playlist" />
    );
  }

  if (playlistQuery.isError) {
    return (
      <ErrorState
        description="Your corrected-conversation playlist is unavailable right now."
        onRetry={() => void playlistQuery.refetch()}
        title="Could not load playlist"
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        description="Listen through your corrected role-play conversations continuously. Only refined audio is included; your original voice recordings are not stored."
        eyebrow="Listening Practice"
        title="Conversation playlist"
      />

      {items.length === 0 ? (
        <EmptyState
          description="Complete a role-play session first. It will appear here after its corrected conversation is ready."
          title="No conversations are ready yet"
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <PageSection description={`${currentIndex + 1} of ${items.length}`} title="Now playing">
            {current ? (
              <div className="space-y-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">Corrected role-play</Badge>
                    <span className="text-sm text-slate-500">{formatDuration(current.durationMs)}</span>
                  </div>
                  <h2 className="mt-3 text-2xl text-slate-950">{current.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">{formatDate(current.endedAt)}</p>
                </div>

                {access.isError ? (
                  <Alert variant="destructive">
                    <AlertDescription>The private audio link could not be loaded. Please try again.</AlertDescription>
                  </Alert>
                ) : access.data ? (
                  <audio
                    className="w-full"
                    controls
                    onEnded={handleEnded}
                    preload="metadata"
                    ref={audioRef}
                    src={access.data.url}
                  >
                    <track kind="captions" />
                  </audio>
                ) : (
                  <p className="text-sm text-slate-500">Preparing secure playback…</p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-2">
                    <Button
                      disabled={items.length < 2}
                      onClick={() => selectItem((currentIndex - 1 + items.length) % items.length)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <ChevronLeft /> Previous
                    </Button>
                    <Button
                      disabled={items.length < 2}
                      onClick={() => selectItem((currentIndex + 1) % items.length)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Next <ChevronRight />
                    </Button>
                  </div>
                  <fieldset className="flex items-center gap-1">
                    <legend className="sr-only">Repeat mode</legend>
                    {(["off", "all", "one"] as const).map((mode) => (
                      <Button
                        key={mode}
                        onClick={() => setRepeatMode(mode)}
                        size="sm"
                        type="button"
                        variant={repeatMode === mode ? "default" : "ghost"}
                      >
                        {mode === "off" ? "Stop at end" : mode === "all" ? "Repeat all" : "Repeat one"}
                      </Button>
                    ))}
                  </fieldset>
                </div>

                <Button asChild variant="outline">
                  <Link params={{ sessionId: current.sessionId }} to="/app/sessions/$sessionId">
                    Open session review
                  </Link>
                </Button>
              </div>
            ) : null}
          </PageSection>

          <PageSection description="Select any conversation, or let playback advance automatically." title="Up next">
            <ol className="space-y-2">
              {items.map((item, index) => (
                <li key={item.sessionId}>
                  <button
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors ${
                      index === currentIndex
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-stone-200 bg-white hover:bg-stone-50"
                    }`}
                    onClick={() => selectItem(index)}
                    type="button"
                  >
                    <Volume2 className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.title}</span>
                      <span className={`block text-xs ${index === currentIndex ? "text-slate-300" : "text-slate-500"}`}>
                        {formatDate(item.endedAt)} · {formatDuration(item.durationMs)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </PageSection>
        </div>
      )}
    </div>
  );
}
