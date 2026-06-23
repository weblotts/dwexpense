import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { AuthResponse, LoginInput, RegisterInput, User } from '@dwexpense/types';
import { api, tokenStore } from '../lib/api';
import { setCurrency } from '../lib/format';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  setUser: (u: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const access = tokenStore.get();
    const refresh = tokenStore.getRefresh();

    if (!access && !refresh) {
      setLoading(false);
      return;
    }

    if (access) {
      // Try the access token first — if it's still valid this is instant.
      api.get<User>('/auth/me')
        .then((r) => { applyServerTheme(r.data); setUser(r.data); })
        .catch(() => {
          // Access token expired; the axios interceptor will use the refresh token
          // and retry automatically. If that also fails, tokens are cleared.
          if (!tokenStore.getRefresh()) setLoading(false);
        })
        .finally(() => setLoading(false));
    } else if (refresh) {
      // No access token but we have a refresh token — get a new pair.
      import('axios').then(({ default: axios }) =>
        axios.post(`${import.meta.env.VITE_API_URL ?? 'http://localhost:5000'}/api/auth/refresh`, { refreshToken: refresh })
      ).then(({ data }: { data: AuthResponse }) => {
        tokenStore.set(data.token);
        tokenStore.setRefresh(data.refreshToken);
        applyServerTheme(data.user);
        setUser(data.user);
      }).catch(() => {
        tokenStore.clearAll();
      }).finally(() => setLoading(false));
    }
  }, []);

  function applyServerTheme(user: User) {
    if (user.theme) {
      const stored = localStorage.getItem('theme');
      if (user.theme !== stored) {
        document.documentElement.classList.toggle('dark', user.theme === 'dark');
        document.documentElement.setAttribute('data-theme', user.theme);
        localStorage.setItem('theme', user.theme);
      }
    }
    if (user.currency) setCurrency(user.currency);
  }

  async function authenticate(path: '/auth/login' | '/auth/register', input: object) {
    const { data } = await api.post<AuthResponse>(path, input);
    tokenStore.set(data.token);
    tokenStore.setRefresh(data.refreshToken);
    applyServerTheme(data.user);
    setUser(data.user);
  }

  const value: AuthState = {
    user,
    loading,
    login: (input) => authenticate('/auth/login', input),
    register: (input) => authenticate('/auth/register', input),
    logout: () => {
      tokenStore.clearAll();
      setUser(null);
    },
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
