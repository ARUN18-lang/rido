import { io } from 'socket.io-client';
import { SOCKET_URL, USE_MOCK_API } from '../constants/api';
import { getMockIncomingRide } from './mockData';

let socket = null;
const mockListeners = {};

export function connectSocket(token) {
  if (USE_MOCK_API) return { id: 'mock' };
  if (socket?.connected) return socket;
  socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function emit(event, payload) {
  if (USE_MOCK_API) return;
  socket?.emit(event, payload);
}

export function emitDriverLocation(loc) {
  emit('driver:location_update', loc);
}

export function acceptRide(rideId) {
  emit('driver:accept', { ride_id: rideId });
}

export function declineRide(rideId) {
  emit('driver:decline', { ride_id: rideId });
}

export function arrivedAtPickup(rideId) {
  emit('driver:arrived', { ride_id: rideId });
}

export function startRide(rideId, otp) {
  emit('driver:start_ride', { ride_id: rideId, otp });
}

export function endRide(rideId) {
  emit('driver:end_ride', { ride_id: rideId });
}

export function on(event, cb) {
  if (USE_MOCK_API) {
    if (!mockListeners[event]) mockListeners[event] = [];
    mockListeners[event].push(cb);
    return () => { mockListeners[event] = mockListeners[event].filter((f) => f !== cb); };
  }
  socket?.on(event, cb);
  return () => socket?.off(event, cb);
}

export function simulateIncomingRide(cb) {
  if (!USE_MOCK_API) return () => {};
  const timer = setTimeout(() => cb(getMockIncomingRide()), 5000);
  return () => clearTimeout(timer);
}
