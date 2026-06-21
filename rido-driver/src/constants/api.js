import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || {};

function resolveDevHost(url) {
  if (!url?.includes('localhost')) return url;
  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  return devHost ? url.replace('localhost', devHost) : url;
}

export const USE_MOCK_API = extra.USE_MOCK_API ?? true;
export const API_BASE_URL = resolveDevHost(extra.API_BASE_URL || 'http://localhost:3000/api/v1');
export const SOCKET_URL = resolveDevHost(extra.SOCKET_URL || 'http://localhost:3000');

export const ENDPOINTS = {
  SEND_OTP: '/auth/send-otp',
  VERIFY_OTP: '/auth/verify-otp',
  REFRESH: '/auth/refresh',
  LOGOUT: '/auth/logout',
  DRIVER_REGISTER: '/drivers/register',
  DRIVER_ME: '/drivers/me',
  DRIVER_STATUS: '/drivers/me/status',
  DRIVER_DOCUMENTS: '/drivers/documents',
  DRIVER_EARNINGS: '/drivers/me/earnings',
  DRIVER_RIDES: '/drivers/me/rides',
  VEHICLES: '/vehicles',
  CASH_CONFIRM: (rideId) => `/payments/${rideId}/cash-confirm`,
  WALLET: '/users/me/wallet',
  INITIATE_PAYMENT: '/payments/initiate',
  VERIFY_PAYMENT: '/payments/verify',
  EMERGENCY_CONTACTS: '/users/emergency-contacts',
};
