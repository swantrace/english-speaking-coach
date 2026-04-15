interface JobJsonViewProps {
  title: string;
  value: unknown;
  emptyMessage: string;
}

function formatValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value === undefined) {
    return null;
  }

  return JSON.stringify(value, null, 2);
}

export function JobJsonView({ title, value, emptyMessage }: JobJsonViewProps) {
  const formattedValue = formatValue(value);

  return (
    <div className="rounded-[1.5rem] border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 px-5 py-4">
        <h3 className="text-base text-slate-950">{title}</h3>
      </div>
      <div className="p-5">
        {formattedValue ? (
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-stone-950 p-4 text-xs leading-6 text-stone-100">
            {formattedValue}
          </pre>
        ) : (
          <p className="text-sm leading-6 text-slate-600">{emptyMessage}</p>
        )}
      </div>
    </div>
  );
}
