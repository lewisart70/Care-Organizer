import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api';
import DisclaimerModal from '../components/DisclaimerModal';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string | null;
  disclaimer_accepted?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  selectedRecipientId: string | null;
  disclaimerAccepted: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: (sessionId: string) => Promise<void>;
  logout: () => Promise<void>;
  setSelectedRecipientId: (id: string | null) => void;
  acceptDisclaimer: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  selectedRecipientId: null,
  disclaimerAccepted: false,
  login: async () => {},
  register: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
  setSelectedRecipientId: () => {},
  acceptDisclaimer: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);

  const loadToken = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('auth_token');
      const storedRecipient = await AsyncStorage.getItem('selected_recipient_id');
      if (stored) {
        setToken(stored);
        api.setToken(stored);
        const userData = await api.get('/auth/me');
        setUser(userData);
        setDisclaimerAccepted(userData.disclaimer_accepted || false);
        
        // Show disclaimer modal if not accepted
        if (!userData.disclaimer_accepted) {
          setShowDisclaimerModal(true);
        }
        
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
    
    // Check if disclaimer needs to be shown
    const accepted = res.user.disclaimer_accepted || false;
    setDisclaimerAccepted(accepted);
    if (!accepted) {
      setShowDisclaimerModal(true);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await api.post('/auth/register', { email, password, name });
    setToken(res.token);
    setUser(res.user);
    api.setToken(res.token);
    await AsyncStorage.setItem('auth_token', res.token);
    
    // New users always need to accept disclaimer
    setDisclaimerAccepted(false);
    setShowDisclaimerModal(true);
  }, []);

  const loginWithGoogle = useCallback(async (sessionId: string) => {
    const res = await api.post('/auth/google', { session_id: sessionId });
    setToken(res.token);
    setUser(res.user);
    api.setToken(res.token);
    await AsyncStorage.setItem('auth_token', res.token);
    
    // Check if disclaimer needs to be shown
    const accepted = res.user.disclaimer_accepted || false;
    setDisclaimerAccepted(accepted);
    if (!accepted) {
      setShowDisclaimerModal(true);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    setToken(null);
    setUser(null);
    setSelectedRecipientId(null);
    setDisclaimerAccepted(false);
    api.setToken(null);
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('selected_recipient_id');
  }, []);

  const acceptDisclaimer = useCallback(() => {
    setDisclaimerAccepted(true);
    setShowDisclaimerModal(false);
    if (user) {
      setUser({ ...user, disclaimer_accepted: true });
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user, token, isLoading, selectedRecipientId, disclaimerAccepted,
      login, register, loginWithGoogle, logout,
      setSelectedRecipientId: handleSetRecipientId,
      acceptDisclaimer,
    }}>
      {children}
      {/* Disclaimer Modal - shown after login/register if not accepted */}
      <DisclaimerModal 
        visible={showDisclaimerModal && !!token && !disclaimerAccepted} 
        onAccept={acceptDisclaimer} 
      />
    </AuthContext.Provider>
  );
}
