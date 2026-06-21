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

const api = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });

function getDeviceId() {
  const store = useAuthStore.getState();
  let id = store.deviceId;
  if (!id) {
    id = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    store.setDeviceId(id);
  }
  return id;
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

async function ensureValidToken() {
  const accessToken = useAuthStore.getState().accessToken;
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!accessToken || !refreshToken || !isTokenExpired(accessToken)) return;

  try {
    const { data } = await axios.post(`${API_BASE_URL}${ENDPOINTS.REFRESH}`, {
      refresh_token: refreshToken,
    });
    const payload = data?.data || data;
    const newToken = payload.access_token;
    useAuthStore.getState().setTokens(newToken, payload.refresh_token || refreshToken);
  } catch {
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
    return { data: null, error: err.response?.data?.error?.message || err.response?.data?.message || err.message };
  }
}

async function uploadFormData(url, formData) {
  try {
    if (USE_MOCK_API) {
      const result = await mockRequest('POST', url, formData);
      return { data: result.data, error: null };
    }

    await ensureValidToken();

    const token = useAuthStore.getState().accessToken;
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;

    if (response.status === 401) {
      useAuthStore.getState().logout();
    }

    if (!response.ok) {
      return { data: null, error: body?.error?.message || body?.message || `Request failed with status ${response.status}` };
    }

    return { data: body, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

function getUploadFile(assetOrUri, fallbackName) {
  const asset = typeof assetOrUri === 'string' ? { uri: assetOrUri } : assetOrUri;
  const uri = asset.uri;
  const filename = asset.fileName || uri.split('/').pop() || fallbackName;
  const extension = filename.includes('.') ? filename.split('.').pop().toLowerCase() : 'jpg';
  const mimeType = asset.mimeType || (extension === 'pdf' ? 'application/pdf' : `image/${extension === 'jpg' ? 'jpeg' : extension}`);

  return { uri, name: filename.includes('.') ? filename : `${filename}.${extension}`, type: mimeType };
}

export const apiService = {
  sendOtp: (phone) => request('POST', ENDPOINTS.SEND_OTP, { phone }),
  verifyOtp: (phone, otp) => request('POST', ENDPOINTS.VERIFY_OTP, { phone, otp, device_id: getDeviceId() }),
  registerDriver: (payload) => request('POST', ENDPOINTS.DRIVER_REGISTER, payload),
  getDriverMe: () => request('GET', ENDPOINTS.DRIVER_ME),
  updateStatus: (status, lat, lng) => request('POST', ENDPOINTS.DRIVER_STATUS, { status, lat, lng }),
  uploadDocument: (type, assetOrUri) => {
    const normalizedType = type === 'AADHAAR_FRONT' || type === 'AADHAAR_BACK' ? 'AADHAAR' : type;
    const formData = new FormData();
    formData.append('document_type', normalizedType);
    formData.append('document', getUploadFile(assetOrUri, `${normalizedType.toLowerCase()}.jpg`));
    return uploadFormData(ENDPOINTS.DRIVER_DOCUMENTS, formData);
  },
  refreshToken: (refreshToken) => request('POST', ENDPOINTS.REFRESH, { refresh_token: refreshToken }),
  getEarnings: () => request('GET', ENDPOINTS.DRIVER_EARNINGS),
  createVehicle: (payload) => request('POST', ENDPOINTS.VEHICLES, payload),
  cashConfirm: (rideId) => request('POST', ENDPOINTS.CASH_CONFIRM(rideId), {}),
  getMyRides: (cursor) => request('GET', ENDPOINTS.DRIVER_RIDES, null, { params: { cursor } }),
  getWallet: () => request('GET', ENDPOINTS.WALLET),
  initiatePayment: (payload) => request('POST', ENDPOINTS.INITIATE_PAYMENT, payload),
  verifyPayment: (payload) => request('POST', ENDPOINTS.VERIFY_PAYMENT, payload),
  getEmergencyContacts: () => request('GET', ENDPOINTS.EMERGENCY_CONTACTS),
  addEmergencyContact: (payload) => request('POST', ENDPOINTS.EMERGENCY_CONTACTS, payload),
  deleteEmergencyContact: (id) => request('DELETE', `${ENDPOINTS.EMERGENCY_CONTACTS}/${id}`),
  logout: (refreshToken) => request('POST', ENDPOINTS.LOGOUT, { refresh_token: refreshToken }),
};

export default apiService;
