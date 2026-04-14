import type { PropsWithChildren, ReactNode } from "react";

interface AuthShellProps extends PropsWithChildren {
  title: string;
  description: string;
  footer?: ReactNode;
}

export function AuthShell({ children, description, footer, title }: AuthShellProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-5xl items-center justify-center px-4 py-10 lg:px-6">
      <div className="grid w-full gap-6 rounded-[2rem] border border-stone-200/80 bg-white/95 p-6 shadow-sm backdrop-blur md:grid-cols-[1.1fr_0.9fr] md:p-8">
        <section className="rounded-[1.5rem] bg-stone-50/80 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">English Coach</p>
          <h1 className="mt-4 text-3xl tracking-tight text-slate-950">{title}</h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">{description}</p>
        </section>
        <section className="flex min-h-full flex-col justify-center rounded-[1.5rem] border border-stone-200/80 bg-white p-6">
          {children}
          {footer ? <div className="mt-6 border-t border-stone-200 pt-4 text-sm text-slate-600">{footer}</div> : null}
        </section>
      </div>
    </div>
  );
}
