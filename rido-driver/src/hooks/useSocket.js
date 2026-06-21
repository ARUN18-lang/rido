import { useEffect } from 'react';
import { connectSocket, disconnectSocket } from '../services/socket';
import { useAuthStore } from '../store/authStore';

export function useSocket() {
  const token = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (token) {
      connectSocket(token);
    }
    return () => disconnectSocket();
  }, [token]);
}
