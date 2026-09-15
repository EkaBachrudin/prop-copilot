import { cn } from '../../lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  shown: number;
  label: string;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  shown,
  label,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 0) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="pagination">
      <span className="pagination__info">
        Showing {shown} of {totalItems} {label}
      </span>
      <div className="pagination__controls">
        <button
          type="button"
          className="pagination__btn"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Prev
        </button>
        {pages.map((value) => (
          <button
            key={value}
            type="button"
            className={cn('pagination__btn', value === page && 'pagination__btn--active')}
            onClick={() => onPageChange(value)}
            aria-label={`Page ${value}`}
            aria-current={value === page ? 'page' : undefined}
          >
            {value}
          </button>
        ))}
        <button
          type="button"
          className="pagination__btn"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
