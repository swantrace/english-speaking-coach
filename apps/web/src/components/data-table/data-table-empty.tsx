interface DataTableEmptyProps {
  title: string;
  description: string;
}

export function DataTableEmpty({ title, description }: DataTableEmptyProps) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <h3 className="text-lg text-slate-950">{title}</h3>
      <p className="max-w-xl text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
