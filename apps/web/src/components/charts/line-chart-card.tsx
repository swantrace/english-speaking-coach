import type { PropsWithChildren, ReactNode } from "react";

interface LineChartCardProps extends PropsWithChildren {
  title: string;
  description?: string;
  footer?: ReactNode;
}

export function LineChartCard({ title, description, footer, children }: LineChartCardProps) {
  return (
    <article className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-lg text-slate-950">{title}</h3>
        {description ? <p className="text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      <div className="mt-5 h-64">{children}</div>
      {footer ? <div className="mt-4 border-t border-stone-200/80 pt-4">{footer}</div> : null}
    </article>
  );
}
