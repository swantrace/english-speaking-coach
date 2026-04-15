import { Button } from "@english-coach/ui";

interface ErrorStateProps {
  title?: string;
  description: string;
  actionLabel?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  description,
  actionLabel = "Try again",
  onRetry,
}: ErrorStateProps) {
  return (
    <section className="rounded-[0.25rem] border border-red-200 bg-red-50/70 p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-600">Request Error</p>
      <h2 className="mt-4 text-2xl text-slate-950">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
      {onRetry ? (
        <Button className="mt-6" onClick={onRetry} type="button" variant="outline">
          {actionLabel}
        </Button>
      ) : null}
    </section>
  );
}
