import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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
  isProfileOwner: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: (googleUserId: string, email: string, name: string, picture?: string) => Promise<void>;
  loginWithApple: (appleUserId: string, email?: string, fullName?: string, identityToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  setSelectedRecipientId: (id: string | null) => void;
  setIsProfileOwner: (isOwner: boolean) => void;
  acceptDisclaimer: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  selectedRecipientId: null,
  disclaimerAccepted: false,
  isProfileOwner: true,
  login: async () => {},
  register: async () => {},
  loginWithGoogle: async () => {},
  loginWithApple: async () => {},
  logout: async () => {},
  setSelectedRecipientId: () => {},
  setIsProfileOwner: () => {},
  acceptDisclaimer: () => {},
});

export const useAuth = () => useContext(AuthContext);

// Helper: common post-login state setup
function handleAuthSuccess(
  res: any,
  setToken: (t: string) => void,
  setUser: (u: User) => void,
  setDisclaimerAccepted: (v: boolean) => void,
  setShowDisclaimerModal: (v: boolean) => void,
) {
  setToken(res.token);
  setUser(res.user);
  api.setToken(res.token);
  AsyncStorage.setItem('auth_token', res.token);
  const accepted = res.user.disclaimer_accepted || false;
  setDisclaimerAccepted(accepted);
  if (!accepted) {
    setShowDisclaimerModal(true);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [isProfileOwner, setIsProfileOwner] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('auth_token');
        const storedRecipient = await AsyncStorage.getItem('selected_recipient_id');
        if (stored && !cancelled) {
          setToken(stored);
          api.setToken(stored);
          const userData = await api.get('/auth/me');
          if (cancelled) return;
          setUser(userData);
          setDisclaimerAccepted(userData.disclaimer_accepted || false);
          if (!userData.disclaimer_accepted) {
            setShowDisclaimerModal(true);
          }
          if (storedRecipient) {
            setSelectedRecipientId(storedRecipient);
          }
        }
      } catch {
        if (!cancelled) {
          await AsyncStorage.removeItem('auth_token');
          setToken(null);
          setUser(null);
          api.setToken(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
    handleAuthSuccess(res, setToken, setUser, setDisclaimerAccepted, setShowDisclaimerModal);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await api.post('/auth/register', { email, password, name });
    handleAuthSuccess(res, setToken, setUser, setDisclaimerAccepted, setShowDisclaimerModal);
  }, []);

  const loginWithGoogle = useCallback(async (googleUserId: string, email: string, name: string, picture?: string) => {
    const res = await api.post('/auth/google', {
      google_user_id: googleUserId,
      email,
      name,
      picture,
    });
    handleAuthSuccess(res, setToken, setUser, setDisclaimerAccepted, setShowDisclaimerModal);
  }, []);

  const loginWithApple = useCallback(async (appleUserId: string, email?: string, fullName?: string, identityToken?: string) => {
    const res = await api.post('/auth/apple', {
      user_id: appleUserId,
      email: email,
      full_name: fullName,
      identity_token: identityToken || null,
    });
    handleAuthSuccess(res, setToken, setUser, setDisclaimerAccepted, setShowDisclaimerModal);
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    setToken(null);
    setUser(null);
    setSelectedRecipientId(null);
    setDisclaimerAccepted(false);
    setIsProfileOwner(true);
    api.setToken(null);
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('selected_recipient_id');
  }, []);

  const acceptDisclaimer = useCallback(() => {
    setDisclaimerAccepted(true);
    setShowDisclaimerModal(false);
    setUser(prev => prev ? { ...prev, disclaimer_accepted: true } : prev);
  }, []);

  const contextValue = useMemo<AuthContextType>(() => ({
    user, token, isLoading, selectedRecipientId, disclaimerAccepted, isProfileOwner,
    login, register, loginWithGoogle, loginWithApple, logout,
    setSelectedRecipientId: handleSetRecipientId,
    setIsProfileOwner,
    acceptDisclaimer,
  }), [
    user, token, isLoading, selectedRecipientId, disclaimerAccepted, isProfileOwner,
    login, register, loginWithGoogle, loginWithApple, logout,
    handleSetRecipientId, acceptDisclaimer,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      <DisclaimerModal
        visible={showDisclaimerModal && !!token && !disclaimerAccepted}
        onAccept={acceptDisclaimer}
      />
    </AuthContext.Provider>
  );
}
