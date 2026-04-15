/** biome-ignore-all lint/suspicious/noArrayIndexKey: skeletons are static and not expected to change, so using index as key is acceptable here */
interface DataTableSkeletonProps {
  columnCount?: number;
  rowCount?: number;
}

export function DataTableSkeleton({ columnCount = 6, rowCount = 8 }: DataTableSkeletonProps) {
  return (
    <div className="overflow-hidden rounded-[0.25rem] border border-stone-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <div className="min-w-full">
          <div
            className="grid border-b border-stone-200/80 px-5 py-4"
            style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(120px, 1fr))` }}
          >
            {Array.from({ length: columnCount }, (_, index) => (
              <div className="h-4 w-20 rounded-full bg-stone-200" key={index} />
            ))}
          </div>

          <div className="divide-y divide-stone-200/70">
            {Array.from({ length: rowCount }, (_, rowIndex) => (
              <div
                className="grid items-center gap-4 px-5 py-4"
                key={rowIndex}
                style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(120px, 1fr))` }}
              >
                {Array.from({ length: columnCount }, (_, columnIndex) => (
                  <div className="h-4 w-full max-w-[12rem] rounded-full bg-stone-100" key={columnIndex} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
