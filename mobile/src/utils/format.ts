import dayjs from '@/utils/dayjs';
import { useSettingsStore } from '@/store/settingsStore';

function resolveCurrency(preferred?: string): string {
  const fallback = 'USD';
  const normalized = (preferred ?? useSettingsStore.getState().currency ?? fallback)
    .toString()
    .trim()
    .toUpperCase();
  try {
    // Validate currency; will throw RangeError if invalid
    new Intl.NumberFormat(undefined, { style: 'currency', currency: normalized }).format(0);
    return normalized;
  } catch {
    return fallback;
  }
}

export function formatCurrency(cents: number, currency?: string) {
  const appCurrency = resolveCurrency(currency);
  return Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: appCurrency,
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
