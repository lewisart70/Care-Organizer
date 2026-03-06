import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { COLORS, FONT_SIZES } from '../src/constants/theme';

export default function GoogleCallbackScreen() {
  const { loginWithGoogle } = useAuth();
  const router = useRouter();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processCallback = async () => {
      try {
        if (typeof window === 'undefined') return;
        const hash = window.location.hash;
        const sessionIdMatch = hash.match(/session_id=([^&]+)/);
        if (sessionIdMatch) {
          const sessionId = sessionIdMatch[1];
          await loginWithGoogle(sessionId);
          // Clean the URL hash
          window.history.replaceState(null, '', window.location.pathname);
          router.replace('/(tabs)/home');
        } else {
          router.replace('/');
        }
      } catch (error) {
        console.error('Google auth callback error:', error);
        router.replace('/');
      }
    };

    processCallback();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.text}>Signing you in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  text: { marginTop: 16, fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
});
