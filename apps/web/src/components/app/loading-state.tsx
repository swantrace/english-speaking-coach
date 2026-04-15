interface LoadingStateProps {
  title?: string;
  description?: string;
}

export function LoadingState({
  title = "Loading",
  description = "We’re pulling the latest data for this view.",
}: LoadingStateProps) {
  return (
    <section className="rounded-[0.25rem] border border-stone-200 bg-stone-50/70 p-8">
      <div className="space-y-3">
        <div className="h-3 w-24 rounded-full bg-stone-200" />
        <div className="h-8 w-56 rounded-full bg-stone-200/80" />
        <div className="h-4 max-w-xl rounded-full bg-stone-200/70" />
      </div>
      <div className="mt-6 space-y-2">
        <p className="text-lg text-slate-950">{title}</p>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </section>
  );
}
