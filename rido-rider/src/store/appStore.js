import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAppStore = create(
  persist(
    (set) => ({
      language: 'en',
      themeMode: 'light',
      hasSeenOnboarding: false,
      recentDestinations: [],
      savedPlaces: {
        home: null,
        work: null,
      },
      setLanguage: (language) => set({ language }),
      setThemeMode: (themeMode) => set({ themeMode }),
      setOnboardingSeen: () => set({ hasSeenOnboarding: true }),
      addRecentDestination: (place) =>
        set((state) => {
          const filtered = state.recentDestinations.filter((p) => p.id !== place.id);
          return { recentDestinations: [place, ...filtered].slice(0, 10) };
        }),
      setSavedPlace: (type, place) =>
        set((state) => ({
          savedPlaces: { ...state.savedPlaces, [type]: place },
        })),
    }),
    {
      name: 'rido-app',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
