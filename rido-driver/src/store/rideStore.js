import { create } from 'zustand';

export const useRideStore = create((set) => ({
  isOnline: false,
  activeRide: null,
  incomingRide: null,
  driverRideState: null,
  zone: null,
  setOnline: (isOnline) => set({ isOnline }),
  setActiveRide: (ride) => set({ activeRide: ride, driverRideState: ride ? 'HEADING_TO_PICKUP' : null }),
  setIncomingRide: (ride) => set({ incomingRide: ride }),
  clearIncomingRide: () => set({ incomingRide: null }),
  setDriverRideState: (state) => set({ driverRideState: state }),
  setZone: (zone) => set({ zone }),
  clearRide: () => set({ activeRide: null, incomingRide: null, driverRideState: null }),
}));
