import { useEffect, useRef } from "react";
import type { TranscriptTurnView } from "../types";
import { TranscriptTurn } from "./transcript-turn";

interface TranscriptPaneProps {
  turns: TranscriptTurnView[];
}

export function TranscriptPane({ turns }: TranscriptPaneProps) {
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, []);

  return (
    <section className="rounded-[2rem] border border-stone-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,244,236,0.92))] p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-stone-200/80 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Transcript</p>
          <h2 className="mt-2 text-xl text-slate-950">Live conversation</h2>
        </div>
        <p className="text-sm text-slate-600">{turns.length} turns</p>
      </div>

      <div className="mt-5 h-[26rem] space-y-4 overflow-y-auto pr-1">
        {turns.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-[1.5rem] border border-dashed border-stone-300 bg-white/70 p-6 text-center text-sm leading-6 text-slate-600">
            Join the room and start speaking. Transcript turns and inline hints will stream in here as the session
            unfolds.
          </div>
        ) : (
          turns.map((turn) => <TranscriptTurn key={turn.id} turn={turn} />)
        )}
        <div ref={bottomAnchorRef} />
      </div>
    </section>
  );
}
