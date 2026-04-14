import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section className="rounded-[1.75rem] border border-dashed border-stone-300 bg-stone-50/70 p-8 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Nothing Here Yet</p>
      <h2 className="mt-4 text-2xl text-slate-950">{title}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </section>
  );
}
