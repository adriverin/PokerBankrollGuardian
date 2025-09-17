import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from '@/utils/dayjs';

export type StakeProfile = {
  sbCents: number;
  bbCents: number;
  buyInCents: number;
};

type NotificationSettings = {
  remindersEnabled: boolean;
  reminderSchedule: string[];
  stakeAlertEnabled: boolean;
  stakeAlertThreshold: number;
};

type SettingsState = {
  currency: string;
  timezone: string;
  defaultStake: StakeProfile;
  biometricLockEnabled: boolean;
  biometricLastUnlock?: string;
  idleLockMinutes: number;
  notificationSettings: NotificationSettings;
  lastSessionDefaults?: Partial<StakeProfile> & {
    venue?: string;
    game?: string;
  };
  setCurrency: (currency: string) => void;
  setTimezone: (tz: string) => void;
  setDefaultStake: (stake: StakeProfile) => void;
  setBiometricLockEnabled: (enabled: boolean) => void;
  setBiometricLastUnlock: (iso: string) => void;
  setIdleLockMinutes: (minutes: number) => void;
  updateNotifications: (settings: Partial<NotificationSettings>) => void;
  updateLastSessionDefaults: (
    defaults: SettingsState['lastSessionDefaults']
  ) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      currency: 'USD',
      timezone: dayjs.tz?.guess?.() ?? 'UTC',
      defaultStake: { sbCents: 100, bbCents: 200, buyInCents: 20000 },
      biometricLockEnabled: false,
      idleLockMinutes: 10,
      notificationSettings: {
        remindersEnabled: false,
        reminderSchedule: ['fri-18:00'],
        stakeAlertEnabled: true,
        stakeAlertThreshold: 15
      },
      setCurrency: (currency) => set({ currency }),
      setTimezone: (timezone) => set({ timezone }),
      setDefaultStake: (defaultStake) => set({ defaultStake }),
      setBiometricLockEnabled: (enabled) =>
        set({ biometricLockEnabled: enabled, biometricLastUnlock: undefined }),
      setBiometricLastUnlock: (iso) => set({ biometricLastUnlock: iso }),
      setIdleLockMinutes: (minutes) => set({ idleLockMinutes: minutes }),
      updateNotifications: (notificationSettings) =>
        set((state) => ({
          notificationSettings: { ...state.notificationSettings, ...notificationSettings }
        })),
      updateLastSessionDefaults: (defaults) =>
        set((state) => ({
          lastSessionDefaults: { ...state.lastSessionDefaults, ...defaults }
        }))
    }),
    {
      name: 'settings-store',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
