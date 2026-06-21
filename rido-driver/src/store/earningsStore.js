import { create } from 'zustand';

export const useEarningsStore = create((set) => ({
  todayEarnings: 0,
  todayTrips: 0,
  weekData: [],
  trips: [],
  setToday: (earnings, trips) => set({ todayEarnings: earnings, todayTrips: trips }),
  setWeekData: (data) => set({ weekData: data }),
  setTrips: (trips) => set({ trips }),
  addTrip: (trip) =>
    set((state) => ({
      trips: [trip, ...state.trips],
      todayEarnings: state.todayEarnings + (trip.earnings || 0),
      todayTrips: state.todayTrips + 1,
    })),
}));
