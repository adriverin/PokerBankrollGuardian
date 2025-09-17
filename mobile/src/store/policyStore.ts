import { create } from 'zustand';
import type { Policy } from '@/types';

interface PolicyState {
  policies: Record<string, Policy>;
  hydrate: (policies: Policy[]) => void;
  upsert: (policy: Policy) => void;
}

export const usePolicyStore = create<PolicyState>((set) => ({
  policies: {},
  hydrate: (policies) =>
    set(() => ({
      policies: policies.reduce<Record<string, Policy>>((acc, policy) => {
        acc[policy.id] = policy;
        return acc;
      }, {})
    })),
  upsert: (policy) =>
    set((state) => ({
      policies: {
        ...state.policies,
        [policy.id]: policy
      }
    }))
}));
