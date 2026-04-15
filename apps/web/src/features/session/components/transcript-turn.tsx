import { Badge, cn } from "@english-coach/ui";
import type { SessionTranscriptReviewTurn, TranscriptTurnView } from "../types";
import { HintList } from "./hint-list";

interface TranscriptTurnProps {
  turn: SessionTranscriptReviewTurn | TranscriptTurnView;
}

export function TranscriptTurn({ turn }: TranscriptTurnProps) {
  const isUser = turn.speaker === "user";
  const hints = "hints" in turn ? turn.hints : [];
  const hasStatus = "status" in turn;
  const hasOrder = "order" in turn;
  const isRewritten = "isRewritten" in turn ? turn.isRewritten : false;

  return (
    <article className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[88%] space-y-2", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-[1.75rem] border px-4 py-3 shadow-sm",
            isUser ? "border-slate-900 bg-slate-950 text-white" : "border-stone-200 bg-white text-slate-900",
          )}
        >
          <div className="flex items-center gap-2">
            <p className={cn("text-sm font-semibold", isUser ? "text-white/90" : "text-slate-900")}>
              {turn.speakerLabel}
            </p>
            {hasOrder ? (
              <Badge
                className={cn(
                  "border shadow-none",
                  isUser ? "border-white/20 bg-white/10 text-white/80" : "border-stone-200 bg-stone-50 text-stone-700",
                )}
                variant="outline"
              >
                Turn {turn.order}
              </Badge>
            ) : null}
            {hasStatus ? (
              <Badge
                className={cn(
                  "border shadow-none",
                  turn.status === "partial"
                    ? isUser
                      ? "border-white/20 bg-white/10 text-white/80"
                      : "border-stone-200 bg-stone-100 text-stone-700"
                    : isUser
                      ? "border-white/20 bg-white/10 text-white/80"
                      : "border-stone-200 bg-stone-50 text-stone-700",
                )}
                variant="outline"
              >
                {turn.status === "partial" ? "Listening" : "Final"}
              </Badge>
            ) : null}
            {isRewritten ? (
              <Badge
                className={cn(
                  "border shadow-none",
                  isUser
                    ? "border-emerald-200 bg-white/10 text-white"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700",
                )}
                variant="outline"
              >
                Refined
              </Badge>
            ) : null}
          </div>
          <p className={cn("mt-2 whitespace-pre-wrap text-sm leading-7", isUser ? "text-white" : "text-slate-700")}>
            {turn.text}
          </p>
        </div>

        {hints.length > 0 ? (
          <div className={cn("max-w-xl", isUser ? "ml-auto" : "")}>
            <HintList hints={hints} />
          </div>
        ) : null}
      </div>
    </article>
  );
}
