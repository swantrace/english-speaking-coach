import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
}

export function PageHeader({ title, description, actions, eyebrow }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-stone-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-2">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">{eyebrow}</p> : null}
        <div className="space-y-2">
          <h1 className="text-3xl text-slate-950">{title}</h1>
          {description ? <p className="max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}
