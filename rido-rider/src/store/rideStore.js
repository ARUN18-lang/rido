import { create } from 'zustand';

export const useRideStore = create((set) => ({
  activeRide: null,
  driverLocation: null,
  rideStatus: null,
  pool: null,
  bookingDraft: null,
  setBookingDraft: (draft) => set({ bookingDraft: draft }),
  setActiveRide: (ride) =>
    set({
      activeRide: ride,
      rideStatus: ride?.status || null,
      pool: ride?.pool || null,
    }),
  updateDriverLocation: (location) => set({ driverLocation: location }),
  updateRideStatus: (status) => set({ rideStatus: status }),
  setPool: (pool) => set({ pool }),
  clearRide: () =>
    set({ activeRide: null, driverLocation: null, rideStatus: null, pool: null, bookingDraft: null }),
}));
