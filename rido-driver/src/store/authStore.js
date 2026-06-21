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
      driver: null,
      accessToken: null,
      refreshToken: null,
      deviceId: null,
      isLoggedIn: false,
      setUser: (user) => set({ user, isLoggedIn: !!user }),
      setDriver: (driver) => set({ driver }),
      setDeviceId: (deviceId) => set({ deviceId }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken, isLoggedIn: true }),
      logout: () => set({ user: null, driver: null, accessToken: null, refreshToken: null, isLoggedIn: false }),
    }),
    {
      name: 'rido-driver-auth',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        user: state.user,
        driver: state.driver,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        deviceId: state.deviceId,
        isLoggedIn: state.isLoggedIn,
      }),
    }
  )
);
