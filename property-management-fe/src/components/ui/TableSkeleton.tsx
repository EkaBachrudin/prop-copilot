interface TableSkeletonProps {
  columns: number;
  rows?: number;
}

export function TableSkeleton({ columns, rows = 6 }: TableSkeletonProps) {
  return (
    <div className="p-4" aria-hidden="true">
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid items-center gap-4"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, columnIndex) => (
              <div
                key={columnIndex}
                className="skeleton h-4"
                style={{ opacity: rowIndex === 0 ? 0.6 : 1 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
