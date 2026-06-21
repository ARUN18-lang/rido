import * as Location from 'expo-location';

export async function requestLocationPermission() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentLocation() {
  const granted = await requestLocationPermission();
  if (!granted) return { location: null, error: 'Permission denied' };

  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      location: {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        heading: loc.coords.heading,
      },
      error: null,
    };
  } catch (err) {
    return { location: null, error: err.message };
  }
}

export async function reverseGeocode(lat, lng) {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (results.length) {
      const r = results[0];
      const parts = [r.name, r.street, r.district, r.city].filter(Boolean);
      return parts.join(', ') || 'Current Location';
    }
    return 'Current Location';
  } catch {
    return 'Current Location';
  }
}

export const DEFAULT_REGION = {
  latitude: 9.9252,
  longitude: 78.1198,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};
