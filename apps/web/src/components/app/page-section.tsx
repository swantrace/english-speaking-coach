import type { PropsWithChildren, ReactNode } from "react";

interface PageSectionProps extends PropsWithChildren {
  title?: ReactNode;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageSection({ title, description, actions, className, children }: PageSectionProps) {
  return (
    <section className={className}>
      {title || description || actions ? (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            {title ? <h2 className="text-xl text-slate-950">{title}</h2> : null}
            {description ? <p className="text-sm leading-6 text-slate-600">{description}</p> : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
