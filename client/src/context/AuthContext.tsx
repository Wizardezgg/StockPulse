import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest, getAuthToken, setAuthToken } from '../api/client';
import type { StoreSettings, User } from '../types';

interface AuthContextValue {
  user: User | null;
  settings: StoreSettings | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { name: string; storeName: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshSettings: () => Promise<void>;
  setSettings: React.Dispatch<React.SetStateAction<StoreSettings | null>>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSettings = async () => {
    try {
      const res = await apiRequest<{ settings: StoreSettings }>('/settings');
      setSettings(res.settings);
    } catch {
      // Ignore if unauthenticated
    }
  };

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }
    apiRequest<{ user: User }>('/auth/me')
      .then(async (res) => {
        setUser(res.user);
        await refreshSettings();
      })
      .catch(() => {
        setAuthToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiRequest<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setAuthToken(res.token);
    setUser(res.user);
    await refreshSettings();
  };

  const register = async (payload: { name: string; storeName: string; email: string; password: string }) => {
    const res = await apiRequest<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setAuthToken(res.token);
    setUser(res.user);
    await refreshSettings();
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    setSettings(null);
  };

  return (
    <AuthContext.Provider value={{ user, settings, loading, login, register, logout, refreshSettings, setSettings }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
