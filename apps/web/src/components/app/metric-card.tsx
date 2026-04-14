import { cn } from "@english-coach/ui";

interface MetricCardProps {
  label: string;
  value: string;
  helperText?: string;
  accentClassName?: string;
}

export function MetricCard({ label, value, helperText, accentClassName }: MetricCardProps) {
  return (
    <article className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
      <div className={cn("h-1.5 w-14 rounded-full bg-stone-200", accentClassName)} />
      <p className="mt-4 text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-3xl text-slate-950">{value}</p>
      {helperText ? <p className="mt-2 text-sm leading-6 text-slate-500">{helperText}</p> : null}
    </article>
  );
}
