import type { PropsWithChildren, ReactNode } from "react";

interface AppShellProps extends PropsWithChildren {
  title: string;
  description: string;
  navigation?: ReactNode;
}

export function AppShell({ title, description, navigation, children }: AppShellProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-6">
      <aside className="w-full shrink-0 rounded-[2rem] border border-stone-200/80 bg-white/80 p-6 shadow-sm backdrop-blur lg:sticky lg:top-6 lg:max-w-xs">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">English Coach</p>
        <h1 className="mt-4 text-3xl text-slate-950">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
        {navigation ? <div className="mt-6">{navigation}</div> : null}
      </aside>
      <main className="min-w-0 flex-1 rounded-[2rem] border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8">
        {children}
      </main>
    </div>
  );
}
