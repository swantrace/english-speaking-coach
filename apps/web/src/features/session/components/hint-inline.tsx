import { cn } from "@english-coach/ui";
import type { SessionHint } from "../types";

interface HintInlineProps {
  hint: SessionHint;
}

const hintStyles = {
  error_hint: "border-red-200 bg-red-50/80 text-red-700",
  fluency_hint: "border-sky-200 bg-sky-50/80 text-sky-700",
  knowledge_hint: "border-amber-200 bg-amber-50/80 text-amber-700",
} as const;

export function HintInline({ hint }: HintInlineProps) {
  return (
    <div className={cn("rounded-2xl border px-3 py-2 text-sm shadow-xs", hintStyles[hint.kind])}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">{hint.label}</p>
      <p className="mt-1 leading-6">{hint.text}</p>
    </div>
  );
}
