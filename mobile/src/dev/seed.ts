import dayjs from '@/utils/dayjs';
import { useSessionStore } from '@/store/sessionStore';
import { useSettingsStore } from '@/store/settingsStore';
import { upsertCashSession } from '@/db/repository';
import type { CashSession } from '@/types';

export async function seedExampleFiveFiveChf(): Promise<void> {
  const sessionsState = useSessionStore.getState();
  const settingsState = useSettingsStore.getState();

  // Avoid duplicate seeding
  const existing = Object.keys(sessionsState.cashById).some((id) => id.startsWith('seed-55chf-'));
  if (existing) return;

  // Configure locale to CHF and default stake to 5/5
  settingsState.setCurrency('CHF');
  settingsState.setDefaultStake({ sbCents: 500, bbCents: 500, buyInCents: 50000 });

  const template = [
    { daysAgo: 21, venue: 'Zurich HB', buyin: 50000, cashout: 74000, tips: 400, minutes: 300 }, // +236 CHF
    { daysAgo: 19, venue: 'Grand Casino Basel', buyin: 50000, cashout: 30000, tips: 300, minutes: 180 }, // -203 CHF
    { daysAgo: 16, venue: 'Zurich HB', buyin: 50000, cashout: 58000, tips: 200, minutes: 240 }, // +78 CHF
    { daysAgo: 12, venue: 'Grand Casino Baden', buyin: 60000, cashout: 38000, tips: 0, minutes: 360 }, // -220 CHF
    { daysAgo: 10, venue: 'Zurich HB', buyin: 50000, cashout: 115000, tips: 500, minutes: 420 }, // +645 CHF
    { daysAgo: 7, venue: 'Grand Casino Basel', buyin: 50000, cashout: 45000, tips: 200, minutes: 150 }, // -52 CHF
    { daysAgo: 3, venue: 'Zurich HB', buyin: 50000, cashout: 55000, tips: 200, minutes: 180 }, // +48 CHF
    { daysAgo: 1, venue: 'Grand Casino Baden', buyin: 50000, cashout: 49000, tips: 100, minutes: 240 } // -11 CHF
  ];

  for (let i = 0; i < template.length; i += 1) {
    const t = template[i];
    const start = dayjs().subtract(t.daysAgo, 'day').hour(19).minute(0).second(0).millisecond(0);
    const end = start.add(t.minutes, 'minute');
    const payload: Omit<CashSession, 'updatedAt'> = {
      id: `seed-55chf-${i + 1}`,
      userId: 'me',
      startTs: start.toISOString(),
      endTs: end.toISOString(),
      venue: t.venue,
      game: 'NLH',
      sbCents: 500,
      bbCents: 500,
      buyinCents: t.buyin,
      cashoutCents: t.cashout,
      tipsCents: t.tips,
      notes: 'Seeded example session (5/5 CHF)',
      tags: ['5-5', 'CHF', 'seed'],
      durationMinutes: t.minutes,
      dirty: false
    } as any;

    const added = sessionsState.addCashSession(payload);
    await upsertCashSession(added);
  }
}


