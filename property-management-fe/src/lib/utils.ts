import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));

export const formatNumber = (value: number | null | undefined, fractionDigits = 2): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value);
};

export const formatArea = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '-';
  return `${formatNumber(value)} m²`;
};

export const pluralize = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;

export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

export const formatTime = (value: string | null | undefined): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(date);
};
