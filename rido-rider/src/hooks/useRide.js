import { useRideStore } from '../store/rideStore';
import { ACTIVE_RIDE_STATUSES } from '../constants/ride';

export function useRide() {
  const { activeRide, rideStatus, driverLocation, pool, bookingDraft } = useRideStore();
  const hasActiveRide = activeRide && ACTIVE_RIDE_STATUSES.includes(rideStatus || activeRide?.status);

  return { activeRide, rideStatus, driverLocation, pool, bookingDraft, hasActiveRide };
}
