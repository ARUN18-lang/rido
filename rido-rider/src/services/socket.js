import { io } from 'socket.io-client';
import { SOCKET_URL, USE_MOCK_API } from '../constants/api';
import { MOCK_DRIVER, MOCK_RIDE } from './mockData';

let socket = null;
const mockListeners = {};

function emitMock(event, payload) {
  (mockListeners[event] || []).forEach((cb) => cb(payload));
}

export function connectSocket(token) {
  if (USE_MOCK_API) {
    return { id: 'mock-socket' };
  }
  if (socket?.connected) return socket;
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function joinRideRoom(rideId) {
  if (USE_MOCK_API) return;
  socket?.emit('join_ride', { ride_id: rideId });
}

export function on(event, cb) {
  if (USE_MOCK_API) {
    if (!mockListeners[event]) mockListeners[event] = [];
    mockListeners[event].push(cb);
    return () => {
      mockListeners[event] = mockListeners[event].filter((fn) => fn !== cb);
    };
  }
  socket?.on(event, cb);
  return () => socket?.off(event, cb);
}

export function off(event, cb) {
  if (USE_MOCK_API) {
    mockListeners[event] = (mockListeners[event] || []).filter((fn) => fn !== cb);
    return;
  }
  socket?.off(event, cb);
}

export function onDriverLocation(cb) {
  return on('ride:driver_location', cb);
}

export function onRideStatus(cb) {
  return on('ride:status_update', cb);
}

export function onPoolMatched(cb) {
  return on('ride:pool_matched', cb);
}

export function onDriverAssigned(cb) {
  return on('ride:driver_assigned', cb);
}

export function onDriverArrived(cb) {
  return on('ride:driver_arrived', cb);
}

export function onRideComplete(cb) {
  return on('ride:completed', cb);
}

export function onRouteDeviation(cb) {
  return on('ride:route_deviation', cb);
}

export function simulateMockRideFlow(ride) {
  if (!USE_MOCK_API) return () => {};

  const timers = [];

  if (ride.mode === 'SHARED' && ride.status === 'POOL_MATCHING') {
    timers.push(
      setTimeout(() => {
        emitMock('ride:pool_matched', { ride_id: ride.id, pool: MOCK_RIDE.pool });
      }, 5000)
    );
  }

  timers.push(
    setTimeout(() => {
      emitMock('ride:driver_assigned', {
        ride_id: ride.id,
        driver: MOCK_DRIVER,
        otp: '4821',
        eta_min: 4,
      });
    }, ride.mode === 'SHARED' ? 8000 : 4000)
  );

  timers.push(
    setTimeout(() => {
      emitMock('ride:driver_location', { lat: 9.928, lng: 78.122, heading: 45, eta_min: 2 });
    }, 10000)
  );

  timers.push(
    setTimeout(() => {
      emitMock('ride:driver_arrived', { ride_id: ride.id });
    }, 14000)
  );

  timers.push(
    setTimeout(() => {
      emitMock('ride:status_update', { ride_id: ride.id, status: 'IN_PROGRESS' });
    }, 16000)
  );

  return () => timers.forEach(clearTimeout);
}
