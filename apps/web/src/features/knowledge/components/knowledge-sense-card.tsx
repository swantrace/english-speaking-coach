import { Badge } from "@english-coach/ui";
import type { KnowledgeSenseView } from "../types";

interface KnowledgeSenseCardProps {
  sense: KnowledgeSenseView;
}

export function KnowledgeSenseCard({ sense }: KnowledgeSenseCardProps) {
  return (
    <article className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">Sense {sense.order}</Badge>
        {sense.grammaticalNote ? <Badge variant="outline">{sense.grammaticalNote}</Badge> : null}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Meaning (EN)</p>
          <p className="text-sm leading-6 text-slate-800">{sense.meaningEn}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Meaning (ZH)</p>
          <p className="text-sm leading-6 text-slate-800">{sense.meaningZh}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Example</p>
          <p className="text-sm leading-6 text-slate-800">{sense.example}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Example (ZH)</p>
          <p className="text-sm leading-6 text-slate-800">{sense.exampleZh}</p>
        </div>
      </div>
    </article>
  );
}
