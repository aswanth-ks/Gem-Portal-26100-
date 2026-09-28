import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError, clearToken, getToken, setToken } from '@/lib/api';
import type { ApiProfile } from '@/lib/types';

interface AuthUser {
  id: string;
  email: string;
}

interface RegisterInput {
  email: string;
  password: string;
  organizationName: string;
  registrationNumber: string;
  contactPerson: string;
  phone: string;
  address: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  profile: ApiProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ApiProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get<{ user: AuthUser; profile: ApiProfile }>('/auth/me');
      setUser(res.user);
      setProfile(res.profile);
    } catch (err) {
      // Expired/invalid session — clear it so RequireBidderAuth sends the user back to login.
      if (err instanceof ApiError) clearToken();
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<{ token: string; user: AuthUser }>('/auth/login', { email, password });
      setToken(res.token);
      setUser(res.user);
      await loadMe();
    },
    [loadMe],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const res = await api.post<{ token: string; user: AuthUser }>('/auth/register', input);
      setToken(res.token);
      setUser(res.user);
      await loadMe();
    },
    [loadMe],
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo(() => ({ user, profile, loading, login, register, logout }), [user, profile, loading, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
