import { Badge, cn } from "@english-coach/ui";
import type { TranscriptTurnView } from "../types";
import { HintList } from "./hint-list";

interface TranscriptTurnProps {
  turn: TranscriptTurnView;
}

export function TranscriptTurn({ turn }: TranscriptTurnProps) {
  const isUser = turn.speaker === "user";

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
          </div>
          <p className={cn("mt-2 whitespace-pre-wrap text-sm leading-7", isUser ? "text-white" : "text-slate-700")}>
            {turn.text}
          </p>
        </div>

        {turn.hints.length > 0 ? (
          <div className={cn("max-w-xl", isUser ? "ml-auto" : "")}>
            <HintList hints={turn.hints} />
          </div>
        ) : null}
      </div>
    </article>
  );
}
