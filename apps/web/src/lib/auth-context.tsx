'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  api,
  getCurrentUser,
  getToken,
  removeToken,
  setCurrentUser,
  setToken,
  UserSession,
} from './api';

interface AuthContextType {
  user: UserSession | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserSession>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  const refreshUser = async () => {
    try {
      const activeToken = getToken();
      if (!activeToken) {
        setUser(null);
        setTokenState(null);
        setLoading(false);
        return;
      }

      setTokenState(activeToken);
      const cached = getCurrentUser();
      if (cached) {
        setUser(cached);
      }

      // Revalidate with server /auth/me
      const meData = await api.get('/auth/me');
      const refreshedUser: UserSession = {
        id: meData.id,
        email: meData.email,
        role: meData.role,
        permissions: meData.permissions || [],
      };
      setUser(refreshedUser);
      setCurrentUser(refreshedUser);
    } catch {
      removeToken();
      setUser(null);
      setTokenState(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string): Promise<UserSession> => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { accessToken, user: loggedInUser } = res;

      setToken(accessToken);
      setTokenState(accessToken);
      setCurrentUser(loggedInUser);
      setUser(loggedInUser);

      return loggedInUser;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    removeToken();
    setUser(null);
    setTokenState(null);
    router.push('/login');
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return user.permissions?.includes(permission) || false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        hasPermission,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
