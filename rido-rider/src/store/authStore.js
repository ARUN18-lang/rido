import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

const secureStorage = {
  getItem: async (name) => SecureStore.getItemAsync(name),
  setItem: async (name, value) => SecureStore.setItemAsync(name, value),
  removeItem: async (name) => SecureStore.deleteItemAsync(name),
};

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      deviceId: null,
      isLoggedIn: false,
      setUser: (user) => set({ user, isLoggedIn: !!user }),
      setDeviceId: (deviceId) => set({ deviceId }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken, isLoggedIn: true }),
      updateWalletBalance: (balance) =>
        set((state) => ({
          user: state.user ? { ...state.user, wallet_balance: balance } : null,
        })),
      logout: () => set({ user: null, accessToken: null, refreshToken: null, isLoggedIn: false }),
    }),
    {
      name: 'rido-auth',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        deviceId: state.deviceId,
        isLoggedIn: state.isLoggedIn,
      }),
    }
  )
);
