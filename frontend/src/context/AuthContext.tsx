import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  selectedRecipientId: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: (sessionId: string) => Promise<void>;
  logout: () => Promise<void>;
  setSelectedRecipientId: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  selectedRecipientId: null,
  login: async () => {},
  register: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
  setSelectedRecipientId: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);

  const loadToken = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('auth_token');
      const storedRecipient = await AsyncStorage.getItem('selected_recipient_id');
      if (stored) {
        setToken(stored);
        api.setToken(stored);
        const userData = await api.get('/auth/me');
        setUser(userData);
        if (storedRecipient) {
          setSelectedRecipientId(storedRecipient);
        }
      }
    } catch {
      await AsyncStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
      api.setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadToken();
  }, [loadToken]);

  const handleSetRecipientId = useCallback(async (id: string | null) => {
    setSelectedRecipientId(id);
    if (id) {
      await AsyncStorage.setItem('selected_recipient_id', id);
    } else {
      await AsyncStorage.removeItem('selected_recipient_id');
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    setToken(res.token);
    setUser(res.user);
    api.setToken(res.token);
    await AsyncStorage.setItem('auth_token', res.token);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await api.post('/auth/register', { email, password, name });
    setToken(res.token);
    setUser(res.user);
    api.setToken(res.token);
    await AsyncStorage.setItem('auth_token', res.token);
  }, []);

  const loginWithGoogle = useCallback(async (sessionId: string) => {
    const res = await api.post('/auth/google', { session_id: sessionId });
    setToken(res.token);
    setUser(res.user);
    api.setToken(res.token);
    await AsyncStorage.setItem('auth_token', res.token);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    setToken(null);
    setUser(null);
    setSelectedRecipientId(null);
    api.setToken(null);
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('selected_recipient_id');
  }, []);

  return (
    <AuthContext.Provider value={{
      user, token, isLoading, selectedRecipientId,
      login, register, loginWithGoogle, logout,
      setSelectedRecipientId: handleSetRecipientId,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
