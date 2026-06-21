import { useAuthStore } from '../store/authStore';
import { apiService } from '../services/api';

export function useAuth() {
  const { user, isLoggedIn, setUser, setDriver, setTokens, logout } = useAuthStore();

  const login = async (phone, otp) => {
    const { data, error } = await apiService.verifyOtp(phone, otp);
    if (error) return { error };
    const payload = data?.data || data;
    setTokens(payload.access_token, payload.refresh_token);
    setUser(payload.user);
    setDriver(payload.driver || { kyc_status: 'PENDING' });
    return { data: payload, error: null };
  };

  const sendOtp = async (phone) => apiService.sendOtp(phone);

  const signOut = async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (refreshToken) await apiService.logout(refreshToken);
    logout();
  };

  return { user, isLoggedIn, login, sendOtp, signOut, setUser };
}
