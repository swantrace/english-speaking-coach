import type { PropsWithChildren, ReactNode } from "react";

interface FormSectionProps extends PropsWithChildren {
  actions?: ReactNode;
  description?: string;
  title: string;
}

export function FormSection({ actions, children, description, title }: FormSectionProps) {
  return (
    <section className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl text-slate-950">{title}</h2>
          {description ? <p className="max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}
