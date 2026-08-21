import { create } from 'zustand';

interface TwoFAState {
  isPending: boolean;
  requiresSetup: boolean;
  setPending: (v: boolean) => void;
  setRequiresSetup: (v: boolean) => void;
}

export const use2FAStore = create<TwoFAState>((set) => ({
  isPending: false,
  requiresSetup: false,
  setPending: (v) => set({ isPending: v }),
  setRequiresSetup: (v) => set({ requiresSetup: v }),
}));