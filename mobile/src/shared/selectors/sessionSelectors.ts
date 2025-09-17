import { useMemo } from 'react';
import dayjs from '@/utils/dayjs';
import { useSessionStore } from '@/store/sessionStore';
import { useLedgerStore } from '@/store/ledgerStore';
import type { CashSession, LedgerEntry } from '@/types';

const toArray = <T,>(map: Record<string, T>) => Object.values(map);

function sessionNet(session: CashSession) {
  const cashout = session.cashoutCents ?? 0;
  const buyin = session.buyinCents ?? 0;
  const tips = session.tipsCents ?? 0;
  return cashout - buyin - tips;
}

export function useDashboardSummary() {
  const cashSessions = useSessionStore((state) => state.cashById);
  const ledger = useLedgerStore((state) => state.ledgerById);

  return useMemo(() => {
    const cashArray = toArray(cashSessions);
    const ledgerArray = toArray(ledger);
    const bankroll = computeBankroll(cashArray, ledgerArray);
    const last30Profit = computeProfitWindow(cashArray, 30);
    const hourly = computeHourly(cashArray);

    return {
      bankroll,
      last30Profit,
      hourly
    };
  }, [cashSessions, ledger]);
}

function computeBankroll(cashSessions: CashSession[], ledgerEntries: LedgerEntry[]) {
  const cashNet = cashSessions.reduce((total, session) => total + sessionNet(session), 0);
  const ledgerNet = ledgerEntries.reduce((total, entry) => total + entry.amountCents, 0);
  return cashNet + ledgerNet;
}

function computeProfitWindow(sessions: CashSession[], days: number) {
  const start = dayjs().subtract(days, 'day');
  return sessions
    .filter((session) => dayjs(session.endTs ?? session.startTs).isAfter(start))
    .reduce((total, session) => total + sessionNet(session), 0);
}

function computeHourly(sessions: CashSession[]) {
  let minutes = 0;
  let profit = 0;
  for (const session of sessions) {
    if (!session.durationMinutes) continue;
    minutes += session.durationMinutes;
    profit += sessionNet(session);
  }
  if (minutes === 0) return 0;
  return (profit / minutes) * 60;
}

export function computeBankrollTimeline(
  sessions: CashSession[],
  ledgerEntries: LedgerEntry[],
  options: { timezone?: string; start?: string; end?: string } = {}
) {
  const points: { date: string; value: number }[] = [];
  let running = 0;
  const events = [
    ...sessions.map((session) => ({
      date: session.endTs ?? session.startTs,
      value: sessionNet(session)
    })),
    ...ledgerEntries.map((entry) => ({
      date: entry.occurredAt,
      value: entry.amountCents
    }))
  ].sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());

  for (const event of events) {
    running += event.value;
    points.push({ date: event.date, value: running });
  }
  return points;
}
