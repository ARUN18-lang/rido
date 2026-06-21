import { useState, useEffect, useCallback } from 'react';
import { getCurrentLocation, requestLocationPermission } from '../services/location';

export function useLocation() {
  const [location, setLocation] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const granted = await requestLocationPermission();
    setPermissionGranted(granted);
    if (granted) {
      const { location: loc } = await getCurrentLocation();
      setLocation(loc);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { location, permissionGranted, loading, refresh };
}
