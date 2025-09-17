import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export type UserProfile = {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  updatedAt: string;
};

type AuthState = {
  status: AuthStatus;
  accessToken?: string;
  refreshToken?: string;
  user?: UserProfile;
  setStatus: (status: AuthStatus) => void;
  setCredentials: (tokens: { accessToken: string; refreshToken: string }) => void;
  setUser: (user: UserProfile) => void;
  logout: () => Promise<void>;
};

const secureStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name)
};

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        status: 'unauthenticated',
        setStatus: (status) => set({ status }),
        setCredentials: ({ accessToken, refreshToken }) => {
          set({ accessToken, refreshToken, status: 'authenticated' });
        },
        setUser: (user) => set({ user }),
        logout: async () => {
          await Promise.all([
            SecureStore.deleteItemAsync('auth-store'),
            SecureStore.deleteItemAsync('refresh-token')
          ]);
          set({ accessToken: undefined, refreshToken: undefined, user: undefined, status: 'unauthenticated' });
        }
      }),
      {
        name: 'auth-store',
        storage: createJSONStorage(() => secureStorage)
      }
    )
  )
);

export const selectAccessToken = () => useAuthStore.getState().accessToken;
