import axios from 'axios';
import { Platform } from 'react-native';
import { API_BASE_URL, ENDPOINTS, USE_MOCK_API } from '../constants/api';
import { useAuthStore } from '../store/authStore';
import { mockRequest } from './mockData';

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function atobPolyfill(input) {
  let str = input.replace(/=+$/, '');
  let output = '';
  let bc = 0;
  let bs;
  let buffer;
  let idx = 0;

  while ((buffer = str.charAt(idx++))) {
    buffer = BASE64_CHARS.indexOf(buffer);
    if (buffer === -1) continue;
    bs = bc % 4 ? bs * 64 + buffer : buffer;
    if (bc++ % 4) {
      output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
    }
  }

  return output;
}

function base64UrlDecode(value) {
  let base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  base64 += '='.repeat((4 - (base64.length % 4)) % 4);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64, 'base64').toString('binary');
  }
  return atobPolyfill(base64);
}

function parseJwt(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const decoded = base64UrlDecode(parts[1]);
    const utf8 = decodeURIComponent(
      decoded
        .split('')
        .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join('')
    );
    return JSON.parse(utf8);
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  const payload = parseJwt(token);
  if (!payload?.exp) return false;
  return Date.now() >= payload.exp * 1000;
}

let navigationRef = null;

export function setNavigationRef(ref) {
  navigationRef = ref;
}

function getDeviceId() {
  const store = useAuthStore.getState();
  let id = store.deviceId;
  if (!id) {
    id = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    store.setDeviceId(id);
  }
  return id;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let refreshQueue = [];

function processQueue(error, token = null) {
  refreshQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  refreshQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        const { data } = await axios.post(`${API_BASE_URL}${ENDPOINTS.REFRESH}`, { refresh_token: refreshToken });
        const payload = data?.data || data;
        const newToken = payload.access_token;
        useAuthStore.getState().setTokens(newToken, payload.refresh_token || refreshToken);
        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        navigationRef?.reset?.({ index: 0, routes: [{ name: 'Auth' }] });
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

async function ensureValidToken() {
  const accessToken = useAuthStore.getState().accessToken;
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!accessToken || !refreshToken) return;
  if (!isTokenExpired(accessToken)) return;

  try {
    const { data } = await axios.post(`${API_BASE_URL}${ENDPOINTS.REFRESH}`, {
      refresh_token: refreshToken,
    });
    const payload = data?.data || data;
    const newToken = payload.access_token;
    useAuthStore.getState().setTokens(newToken, payload.refresh_token || refreshToken);
  } catch (err) {
    useAuthStore.getState().logout();
  }
}

async function request(method, url, data, config = {}) {
  try {
    if (USE_MOCK_API) {
      const result = await mockRequest(method, url, data);
      return { data: result.data, error: null };
    }

    await ensureValidToken();
    const response = await api({ method, url, data, ...config });
    return { data: response.data, error: null };
  } catch (err) {
    if (__DEV__) {
      console.warn('[Rido API]', method, url, data, err?.response?.status, err?.message);
    }
    const message =
      err.response?.data?.message || err.message || 'No internet connection';
    return { data: null, error: message };
  }
}

export const apiService = {
  sendOtp: (phone) => request('POST', ENDPOINTS.SEND_OTP, { phone }),
  verifyOtp: (phone, otp) => request('POST', ENDPOINTS.VERIFY_OTP, { phone, otp, device_id: getDeviceId() }),
  refresh: (refreshToken) => request('POST', ENDPOINTS.REFRESH, { refresh_token: refreshToken }),
  logout: (refreshToken) => request('POST', ENDPOINTS.LOGOUT, { refresh_token: refreshToken }),
  getMe: () => request('GET', ENDPOINTS.ME),
  updateMe: (payload) => request('PATCH', ENDPOINTS.UPDATE_ME, payload),
  getMyRides: (cursor) => request('GET', ENDPOINTS.MY_RIDES, null, { params: { cursor } }),
  getWallet: () => request('GET', ENDPOINTS.WALLET),
  getEmergencyContacts: () => request('GET', ENDPOINTS.EMERGENCY_CONTACTS),
  addEmergencyContact: (payload) => request('POST', ENDPOINTS.EMERGENCY_CONTACTS, payload),
  deleteEmergencyContact: (id) => request('DELETE', `${ENDPOINTS.EMERGENCY_CONTACTS}/${id}`),
  estimateFare: (payload) => request('POST', ENDPOINTS.FARE_ESTIMATE, payload),
  createRide: (payload) => request('POST', ENDPOINTS.CREATE_RIDE, payload),
  getRide: (id) => request('GET', ENDPOINTS.RIDE_BY_ID(id)),
  cancelRide: (id, reason) => request('POST', ENDPOINTS.CANCEL_RIDE(id), { reason }),
  getDriverLocation: (id) => request('GET', ENDPOINTS.DRIVER_LOCATION(id)),
  getPoolStatus: (id) => request('GET', ENDPOINTS.POOL_STATUS(id)),
  initiatePayment: (payload) => request('POST', ENDPOINTS.INITIATE_PAYMENT, payload),
  verifyPayment: (payload) => request('POST', ENDPOINTS.VERIFY_PAYMENT, payload),
};

export default apiService;
