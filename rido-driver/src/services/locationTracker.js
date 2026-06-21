import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { emitDriverLocation, connectSocket } from './socket';
import { useAuthStore } from '../store/authStore';

const LOCATION_TASK = 'RIDO_DRIVER_LOCATION';
let intervalId = null;
let slowMode = false;

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  const loc = data.locations[0];
  emitDriverLocation({
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    heading: loc.coords.heading || 0,
    speed: loc.coords.speed || 0,
    timestamp: loc.timestamp,
  });
});

export async function startLocationTracking() {
  const token = useAuthStore.getState().accessToken;
  connectSocket(token);

  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') {
    await Location.requestForegroundPermissionsAsync();
  }

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 4000,
    distanceInterval: 10,
    foregroundService: {
      notificationTitle: 'Rido Driver',
      notificationBody: 'You are online and receiving rides',
    },
  });

  intervalId = setInterval(async () => {
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const speedKmh = (loc.coords.speed || 0) * 3.6;
    if (speedKmh < 2) {
      if (!slowMode) slowMode = true;
    } else {
      slowMode = false;
    }
    emitDriverLocation({
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      heading: loc.coords.heading || 0,
      speed: speedKmh,
      timestamp: Date.now(),
    });
  }, slowMode ? 15000 : 4000);
}

export async function stopLocationTracking() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
}

export async function getCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: loc.coords.latitude, lng: loc.coords.longitude, heading: loc.coords.heading || 0 };
}

export const DEFAULT_REGION = {
  latitude: 9.9252,
  longitude: 78.1198,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};
