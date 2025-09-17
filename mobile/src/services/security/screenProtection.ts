import { useEffect } from 'react';
import * as ScreenCapture from 'expo-screen-capture';
import { useSettingsStore } from '@/store/settingsStore';

export function useScreenProtection() {
  const biometricLockEnabled = useSettingsStore((state) => state.biometricLockEnabled);

  useEffect(() => {
    if (biometricLockEnabled) {
      ScreenCapture.preventScreenCaptureAsync().catch((error) =>
        console.warn('Failed to prevent screen capture', error)
      );
    } else {
      ScreenCapture.allowScreenCaptureAsync().catch((error) =>
        console.warn('Failed to allow screen capture', error)
      );
    }
    return () => {
      ScreenCapture.allowScreenCaptureAsync().catch(() => undefined);
    };
  }, [biometricLockEnabled]);
}
