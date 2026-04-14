import type { FreeFormContextSideContent } from "../types";

interface FreeformSideContentProps {
  context: FreeFormContextSideContent;
}

export function FreeformSideContent({ context }: FreeformSideContentProps) {
  return (
    <div className="space-y-5">
      <section className="rounded-[1.5rem] border border-stone-200 bg-white p-4 shadow-xs">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Practice brief</p>
        <h3 className="mt-2 text-lg text-slate-950">{context.summary}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Free-form sessions lean heavily on inline hints, so keep this context nearby while you steer the conversation.
        </p>
      </section>

      <section className="rounded-[1.5rem] border border-stone-200 bg-stone-50/80 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Source context</p>
        <div className="mt-3 max-h-[22rem] overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-slate-700">
          {context.content}
        </div>
      </section>
    </div>
  );
}
