import type { SessionHint } from "../types";
import { HintInline } from "./hint-inline";

interface HintListProps {
  hints: SessionHint[];
}

export function HintList({ hints }: HintListProps) {
  if (hints.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50/80 p-4 text-sm leading-6 text-slate-600">
        Inline hints will appear here as the coach detects moments worth reinforcing.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {hints.map((hint) => (
        <HintInline hint={hint} key={hint.id} />
      ))}
    </div>
  );
}
