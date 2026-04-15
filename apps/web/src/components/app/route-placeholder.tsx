interface RoutePlaceholderProps {
  title: string;
}

export function RoutePlaceholder({ title }: RoutePlaceholderProps) {
  return (
    <section className="rounded-[0.25rem] border border-dashed border-stone-300 bg-stone-50/70 p-8">
      <h2 className="text-2xl text-slate-950">{title}</h2>
    </section>
  );
}
