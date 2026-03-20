import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface User {
  user_id: string;
  email: string;
  first_name?: string;
  picture?: string;
  profile_id?: string;
  auth_provider: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, firstName?: string) => Promise<{ success: boolean; error?: string }>;
  googleAuth: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  linkProfile: (profileId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  googleAuth: async () => ({ success: false }),
  logout: async () => {},
  linkProfile: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    (async () => {
      try {
        const savedToken = await AsyncStorage.getItem('auth_token');
        if (savedToken) {
          const res = await fetch(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${savedToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            setToken(savedToken);
            // Ensure profile_id is cached
            if (data.user.profile_id) {
              await AsyncStorage.setItem('health_profile_id', data.user.profile_id);
            }
          } else {
            await AsyncStorage.removeItem('auth_token');
          }
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const saveAuthData = useCallback(async (authToken: string, userData: User) => {
    setToken(authToken);
    setUser(userData);
    await AsyncStorage.setItem('auth_token', authToken);
    if (userData.profile_id) {
      await AsyncStorage.setItem('health_profile_id', userData.profile_id);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const profileId = await AsyncStorage.getItem('health_profile_id');
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, profile_id: profileId }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        await saveAuthData(data.token, data.user);
        return { success: true };
      }
      return { success: false, error: data.detail || 'Login fehlgeschlagen' };
    } catch {
      return { success: false, error: 'Verbindungsfehler' };
    }
  }, [saveAuthData]);

  const register = useCallback(async (email: string, password: string, firstName?: string) => {
    try {
      const profileId = await AsyncStorage.getItem('health_profile_id');
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, first_name: firstName, profile_id: profileId }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        await saveAuthData(data.token, data.user);
        return { success: true };
      }
      return { success: false, error: data.detail || 'Registrierung fehlgeschlagen' };
    } catch {
      return { success: false, error: 'Verbindungsfehler' };
    }
  }, [saveAuthData]);

  const googleAuth = useCallback(async (sessionId: string) => {
    try {
      const profileId = await AsyncStorage.getItem('health_profile_id');
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, profile_id: profileId }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        await saveAuthData(data.token, data.user);
        return { success: true };
      }
      return { success: false, error: data.detail || 'Google-Login fehlgeschlagen' };
    } catch {
      return { success: false, error: 'Verbindungsfehler' };
    }
  }, [saveAuthData]);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem('auth_token');
    // Keep health_profile_id for local data access
  }, []);

  const linkProfile = useCallback(async (profileId: string) => {
    if (!token) return;
    try {
      await fetch(`${API_URL}/api/auth/link-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ profile_id: profileId }),
      });
      if (user) {
        setUser({ ...user, profile_id: profileId });
      }
      await AsyncStorage.setItem('health_profile_id', profileId);
    } catch {}
  }, [token, user]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.user.profile_id) {
          await AsyncStorage.setItem('health_profile_id', data.user.profile_id);
        }
      }
    } catch {}
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, googleAuth, logout, linkProfile, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
