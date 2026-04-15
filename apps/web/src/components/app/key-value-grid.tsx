import type { ReactNode } from "react";

interface KeyValueGridItem {
  label: string;
  value: ReactNode;
}

interface KeyValueGridProps {
  items: KeyValueGridItem[];
  columns?: 2 | 3 | 4;
}

const columnClassNameMap: Record<NonNullable<KeyValueGridProps["columns"]>, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 xl:grid-cols-3",
  4: "md:grid-cols-2 xl:grid-cols-4",
};

export function KeyValueGrid({ items, columns = 4 }: KeyValueGridProps) {
  return (
    <dl className={`grid gap-4 ${columnClassNameMap[columns]}`}>
      {items.map((item) => (
        <div className="rounded-[1.5rem] border border-stone-200 bg-white p-4 shadow-sm" key={item.label}>
          <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{item.label}</dt>
          <dd className="mt-2 text-sm text-slate-700">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
