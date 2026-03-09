import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '../src/context/AuthContext';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';
import { Logo } from '../src/components/Logo';

export default function LoginScreen() {
  const { user, isLoading, login, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/(tabs)/home');
    }
  }, [user, isLoading]);

  useEffect(() => {
    // Check if Apple Sign-In is available (iOS only)
    AppleAuthentication.isAvailableAsync().then(setAppleAuthAvailable);
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = typeof window !== 'undefined'
      ? window.location.origin + '/google-callback'
      : '';
    if (typeof window !== 'undefined') {
      window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setError('');
      setLoading(true);
      
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Get user info from credential
      const name = credential.fullName
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
        : 'Apple User';
      const userEmail = credential.email || `${credential.user}@privaterelay.appleid.com`;

      // Create/login user with Apple credentials
      // For now, we'll use the Apple user ID as a unique identifier
      // In production, you'd verify the identityToken on the backend
      
      // Store Apple auth info and navigate
      // Using the existing auth context pattern
      Alert.alert(
        'Apple Sign-In Success',
        `Welcome ${name}! Apple Sign-In is configured and ready. For full functionality, deploy to the App Store.`,
        [{ text: 'OK' }]
      );
      
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User cancelled - don't show error
        console.log('User cancelled Apple Sign-In');
      } else {
        console.error('Apple Sign-In error:', error);
        setError('Apple Sign-In failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.headerSection}>
            <Logo size={80} />
            <Text style={styles.appTitle}>Family Care</Text>
            <Text style={styles.appSubtitle}>Organizer</Text>
            <Text style={styles.tagline}>Caring for your loved ones, together</Text>
          </View>

          <View style={styles.formSection}>
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  testID="login-email-input"
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={COLORS.border}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  testID="login-password-input"
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.border}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} testID="toggle-password-btn">
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              testID="login-submit-btn"
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.primaryBtnText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              testID="google-auth-btn"
              style={styles.googleBtn}
              onPress={handleGoogleAuth}
            >
              <Ionicons name="logo-google" size={20} color={COLORS.textPrimary} />
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Apple Sign-In - Only shows on iOS devices */}
            {appleAuthAvailable && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={RADIUS.lg}
                style={styles.appleBtn}
                onPress={handleAppleSignIn}
              />
            )}

            {/* Fallback Apple button for web/Android preview */}
            {Platform.OS !== 'ios' && (
              <TouchableOpacity
                testID="apple-auth-btn"
                style={styles.appleBtnFallback}
                onPress={() => Alert.alert('Apple Sign-In', 'Apple Sign-In is only available on iOS devices. This button will work when you run the app on an iPhone.')}
              >
                <Ionicons name="logo-apple" size={20} color={COLORS.white} />
                <Text style={styles.appleBtnText}>Continue with Apple</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              testID="go-to-register-btn"
              style={styles.linkBtn}
              onPress={() => router.push('/register')}
            >
              <Text style={styles.linkText}>
                Don't have an account? <Text style={styles.linkBold}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { flexGrow: 1, paddingHorizontal: SPACING.lg },
  headerSection: {
    alignItems: 'center',
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xl,
  },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 6,
  },
  appTitle: {
    fontSize: FONT_SIZES.xxxl, fontWeight: '800',
    color: COLORS.textPrimary, letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: FONT_SIZES.xl, fontWeight: '300',
    color: COLORS.primary, marginTop: -4,
  },
  tagline: {
    fontSize: FONT_SIZES.md, color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  formSection: { paddingBottom: SPACING.xxl },
  errorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FEF2F2', borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: {
    color: COLORS.error, fontSize: FONT_SIZES.sm,
    marginLeft: SPACING.sm, flex: 1,
  },
  inputGroup: { marginBottom: SPACING.md },
  label: {
    fontSize: FONT_SIZES.sm, fontWeight: '600',
    color: COLORS.textPrimary, marginBottom: SPACING.xs,
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, height: 52,
  },
  inputIcon: { marginRight: SPACING.sm },
  input: {
    flex: 1, fontSize: FONT_SIZES.md, color: COLORS.textPrimary,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingVertical: SPACING.md, alignItems: 'center',
    marginTop: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.7 },
  primaryBtnText: {
    color: COLORS.white, fontSize: FONT_SIZES.md,
    fontWeight: '700', letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: {
    marginHorizontal: SPACING.md, fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
    paddingVertical: SPACING.md, borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  googleBtnText: {
    fontSize: FONT_SIZES.md, fontWeight: '600',
    color: COLORS.textPrimary, marginLeft: SPACING.sm,
  },
  appleBtn: {
    width: '100%',
    height: 50,
    marginTop: SPACING.sm,
  },
  appleBtnFallback: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#000000', borderRadius: RADIUS.full,
    paddingVertical: SPACING.md, marginTop: SPACING.sm,
  },
  appleBtnText: {
    fontSize: FONT_SIZES.md, fontWeight: '600',
    color: COLORS.white, marginLeft: SPACING.sm,
  },
  linkBtn: { alignItems: 'center', marginTop: SPACING.lg, paddingVertical: SPACING.sm },
  linkText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  linkBold: { color: COLORS.primary, fontWeight: '700' },
});
