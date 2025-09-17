import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import dayjs from '@/utils/dayjs';
import { useSettingsStore } from '@/store/settingsStore';
import { useSecurityStore } from '@/store/securityStore';

const shouldLock = (lastUnlock?: string, idleMinutes?: number) => {
  if (!lastUnlock) {
    return true;
  }
  if (!idleMinutes) {
    return false;
  }
  return dayjs().diff(dayjs(lastUnlock), 'minute') >= idleMinutes;
};

export function useBiometricGate() {
  const biometricLockEnabled = useSettingsStore((state) => state.biometricLockEnabled);
  const idleLockMinutes = useSettingsStore((state) => state.idleLockMinutes);
  const lastUnlock = useSettingsStore((state) => state.biometricLastUnlock);
  const setLastUnlock = useSettingsStore((state) => state.setBiometricLastUnlock);
  const setLocked = useSecurityStore((state) => state.setLocked);

  useEffect(() => {
    let isMounted = true;

    const authenticate = async () => {
      if (!biometricLockEnabled) {
        setLocked(false);
        return;
      }
      const needsLock = shouldLock(lastUnlock, idleLockMinutes);
      if (!needsLock) {
        setLocked(false);
        return;
      }
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false;
      if (!hasHardware || !isEnrolled) {
        setLocked(false);
        return;
      }
      setLocked(true);
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Poker Bankroll Guardian'
      });
      if (!isMounted) {
        return;
      }
      if (result.success) {
        setLocked(false);
        setLastUnlock(dayjs().toISOString());
      } else {
        setLocked(true);
      }
    };

    authenticate();

    const listener = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'active') {
        authenticate();
      }
    });

    return () => {
      isMounted = false;
      listener.remove();
    };
  }, [biometricLockEnabled, idleLockMinutes, lastUnlock, setLastUnlock, setLocked]);
}
