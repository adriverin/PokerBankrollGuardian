import dayjs from '@/utils/dayjs';

export function formatCurrency(cents: number, currency = 'USD') {
  return Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(cents / 100);
}

export function formatHours(minutes: number) {
  const hours = minutes / 60;
  return `${hours.toFixed(2)}h`;
}

export function formatDate(dateIso: string, timezone?: string) {
  return timezone ? dayjs(dateIso).tz(timezone).format('MMM D, YYYY') : dayjs(dateIso).format('MMM D, YYYY');
}

export function safeNumber(value?: number | null, fallback = 0) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }
  return value;
}
