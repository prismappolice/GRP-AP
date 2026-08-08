import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function sanitizeSpreadsheetValue(value) {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'string') return value;
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function sanitizeSpreadsheetRows(rows) {
  return rows.map((row) => Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, sanitizeSpreadsheetValue(value)])
  ));
}
