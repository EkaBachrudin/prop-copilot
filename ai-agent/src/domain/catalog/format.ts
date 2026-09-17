export function formatPrice(value: string | number | null): string {
  if (value === null || value === undefined) return 'N/A';
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(numeric);
}

export const formatSize = (size: number | null): string => (size === null ? 'N/A' : `${size} m²`);

export const formatSizeRange = (min: number | null, max: number | null): string => {
  if (min === null && max === null) return 'N/A';
  if (min !== null && max !== null && min !== max) return `${min}-${max} m²`;
  return formatSize(max ?? min);
};

export const formatPriceRange = (min: number | null, max: number | null): string => {
  if (min === null && max === null) return 'N/A';
  if (min !== null && max !== null && min !== max) {
    return `${formatPrice(min)} - ${formatPrice(max)}`;
  }
  return formatPrice(max ?? min);
};
