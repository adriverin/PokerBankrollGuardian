import { ENV } from '@/constants/env';
import { selectAccessToken, useAuthStore } from '@/store/authStore';
import type { CashSession, LedgerEntry, MttSession, Policy, SimRun, SyncMutation } from '@/types';

export type PullResponse = {
  cursor: string;
  users?: Record<string, unknown>;
  cash_sessions?: CashSession[];
  mtt_sessions?: MttSession[];
  ledger_entries?: LedgerEntry[];
  policies?: Policy[];
  sim_runs?: SimRun[];
};

export class ApiClient {
  constructor(private readonly baseUrl: string = ENV.apiUrl) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = selectAccessToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers
    } as HeadersInit;
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Request failed (${response.status}): ${text}`);
    }
    if (response.status === 204) {
      return {} as T;
    }
    return (await response.json()) as T;
  }

  login(payload: { email: string; password: string }) {
    const body = new URLSearchParams({ username: payload.email, password: payload.password }).toString();
    return this.request<{ access_token: string; refresh_token: string; requires_2fa?: boolean }>(
      '/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      }
    );
  }

  verifyTwoFactor(payload: { email: string; code: string }) {
    return this.request<{ access_token: string; refresh_token: string }>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  refresh(refreshToken: string) {
    return this.request<{ access_token: string; refresh_token: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken })
    });
  }

  getMe() {
    return this.request('/users/me');
  }

  pull(cursor?: string) {
    const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return this.request<PullResponse>(`/sync/pull${params}`);
  }

  push(mutations: SyncMutation[]) {
    return this.request<{ applied: string[]; cursor?: string }>('/sync/push', {
      method: 'POST',
      body: JSON.stringify({ mutations })
    });
  }

  scheduleQuickSync() {
    return this.request('/sync/ping', { method: 'POST' });
  }

  async logout() {
    const refreshToken = useAuthStore.getState().refreshToken;
    try {
      if (refreshToken) {
        await this.request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refreshToken })
        });
      }
    } catch (error) {
      console.warn('Failed to notify server about logout', error);
    }
  }
}

export const apiClient = new ApiClient();
