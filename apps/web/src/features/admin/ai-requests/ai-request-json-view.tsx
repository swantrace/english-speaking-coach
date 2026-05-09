interface AiRequestJsonViewProps {
  title: string;
  value: unknown;
  emptyMessage: string;
}

function formatValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value === undefined || value === null) {
    return null;
  }

  return JSON.stringify(value, null, 2);
}

export function AiRequestJsonView({ title, value, emptyMessage }: AiRequestJsonViewProps) {
  const formattedValue = formatValue(value);

  return (
    <div className="rounded-[0.5rem] border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 px-5 py-4">
        <h3 className="text-base text-slate-950">{title}</h3>
      </div>
      <div className="p-5">
        {formattedValue ? (
          <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-[0.5rem] bg-stone-950 p-4 text-xs leading-6 text-stone-100">
            {formattedValue}
          </pre>
        ) : (
          <p className="text-sm leading-6 text-slate-600">{emptyMessage}</p>
        )}
      </div>
    </div>
  );
}
