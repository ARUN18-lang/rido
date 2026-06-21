import Constants from 'expo-constants';
import { Platform } from 'react-native';

const manifestData = Constants.manifest || Constants.manifest2 || {};
const manifestExtra = manifestData?.extra;
const configExtra = Constants.expoConfig?.extra;
const extra = configExtra || manifestExtra || {};

const debuggerHost =
  manifestData?.debuggerHost?.split(':')[0] ||
  manifestData?.hostUri?.split(':')[0] ||
  manifestData?.packagerOpts?.hostUri?.split(':')[0];
const isAndroidEmulator = Platform.OS === 'android' && !Constants.isDevice;

const defaultApiHost = Platform.OS === 'android' ? 'http://10.0.2.2:3000/api/v1' : 'http://localhost:3000/api/v1';
const defaultSocketHost = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

const hostFromDebugger = debuggerHost ? `http://${debuggerHost}` : null;

function normalizeHost(url) {
  if (Platform.OS !== 'android' || !url?.includes('localhost')) {
    return url;
  }

  if (isAndroidEmulator) {
    return url.replace('localhost', '10.0.2.2');
  }

  if (hostFromDebugger) {
    return url.replace('localhost', debuggerHost);
  }

  console.warn(
    '[Rido] Physical Android device has localhost API_BASE_URL. Set API_BASE_URL to your machine IP in app.config.js or use Expo host.',
  );
  return url;
}

const resolvedApiBaseUrl = normalizeHost(extra.API_BASE_URL || defaultApiHost);
const resolvedSocketUrl = normalizeHost(extra.SOCKET_URL || defaultSocketHost);

export const USE_MOCK_API = extra.USE_MOCK_API ?? true;
export const API_BASE_URL = resolvedApiBaseUrl;
export const SOCKET_URL = resolvedSocketUrl;
export const GOOGLE_MAPS_API_KEY = extra.GOOGLE_MAPS_API_KEY || '';

if (__DEV__) {
  console.log('[Rido] API_BASE_URL', API_BASE_URL);
  console.log('[Rido] SOCKET_URL', SOCKET_URL);
  console.log('[Rido] debugHost', debuggerHost);
  console.log('[Rido] isAndroidEmulator', isAndroidEmulator);
  console.log('[Rido] USE_MOCK_API', USE_MOCK_API);
}

export const ENDPOINTS = {
  SEND_OTP: '/auth/send-otp',
  VERIFY_OTP: '/auth/verify-otp',
  REFRESH: '/auth/refresh',
  LOGOUT: '/auth/logout',
  ME: '/users/me',
  UPDATE_ME: '/users/me',
  MY_RIDES: '/users/me/rides',
  WALLET: '/users/me/wallet',
  EMERGENCY_CONTACTS: '/users/emergency-contacts',
  FARE_ESTIMATE: '/fare/estimate',
  CREATE_RIDE: '/rides',
  RIDE_BY_ID: (id) => `/rides/${id}`,
  CANCEL_RIDE: (id) => `/rides/${id}/cancel`,
  DRIVER_LOCATION: (id) => `/rides/${id}/driver-location`,
  POOL_STATUS: (id) => `/pools/status/${id}`,
  INITIATE_PAYMENT: '/payments/initiate',
  VERIFY_PAYMENT: '/payments/verify',
  PAYMENT_BY_RIDE: (id) => `/payments/${id}`,
};
