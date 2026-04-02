import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../src/context/AuthContext';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';
import { Logo } from '../src/components/Logo';

// Debug logging for auth issues
const logAuthEvent = (event: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[AUTH ${timestamp}] ${event}`, data ? JSON.stringify(data, null, 2) : '');
};

// Google OAuth Client ID for iOS
const GOOGLE_IOS_CLIENT_ID = '477062471666-2a4df0o10g8b4fkh9asstlln7mpo93h1.apps.googleusercontent.com';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { user, isLoading, login, loginWithApple, loginWithGoogle } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

  // Google Sign-In configuration
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    logAuthEvent('LoginScreen mounted', { isLoading, hasUser: !!user });
    if (!isLoading && user) {
      logAuthEvent('User already authenticated, navigating to home', { userId: user.user_id });
      router.replace('/(tabs)/home');
    }
  }, [user, isLoading]);

  useEffect(() => {
    // Check if Apple Sign-In is available (iOS only)
    AppleAuthentication.isAvailableAsync().then((available) => {
      logAuthEvent('Apple Sign-In availability check', { available, platform: Platform.OS });
      setAppleAuthAvailable(available);
    });
  }, []);

  // Handle Google Sign-In response
  useEffect(() => {
    if (response?.type === 'success') {
      logAuthEvent('Google auth response success', { hasAccessToken: !!response.authentication?.accessToken });
      const { authentication } = response;
      if (authentication?.accessToken) {
        handleGoogleLogin(authentication.accessToken);
      }
    } else if (response) {
      logAuthEvent('Google auth response', { type: response.type });
    }
  }, [response]);

  const handleGoogleLogin = async (accessToken: string) => {
    try {
      setLoading(true);
      setError('');
      logAuthEvent('Google login started');
      
      // Fetch user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await userInfoResponse.json();
      logAuthEvent('Google user info fetched', { email: userInfo.email, hasId: !!userInfo.id });
      
      // Login with Google credentials via our backend
      await loginWithGoogle(userInfo.id, userInfo.email, userInfo.name, userInfo.picture);
      logAuthEvent('Google login successful, navigating to home');
      
      router.replace('/(tabs)/home');
    } catch (e: any) {
      logAuthEvent('Google login error', { message: e.message, code: e.code });
      console.error('Google login error:', e);
      setError(e.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    logAuthEvent('Email login started', { email: email.trim() });
    try {
      await login(email.trim(), password);
      logAuthEvent('Email login successful, navigating to home');
      router.replace('/(tabs)/home');
    } catch (e: any) {
      logAuthEvent('Email login error', { message: e.message });
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    // Use expo-auth-session for Google Sign-In
    promptAsync();
  };

  const handleAppleSignIn = async () => {
    try {
      setError('');
      setLoading(true);
      logAuthEvent('Apple Sign-In started', { platform: Platform.OS });
      
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      logAuthEvent('Apple credential received', { 
        hasUser: !!credential.user, 
        hasEmail: !!credential.email,
        hasFullName: !!credential.fullName 
      });

      // Get user info from credential
      // Note: Apple only provides email/name on FIRST sign-in
      const fullName = credential.fullName
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
        : undefined;

      logAuthEvent('Calling loginWithApple', { 
        userId: credential.user?.substring(0, 10) + '...', 
        email: credential.email,
        fullName 
      });

      // Use AuthContext to login with Apple
      await loginWithApple(
        credential.user,
        credential.email || undefined,
        fullName || undefined
      );
      
      logAuthEvent('Apple login successful, navigating to home');
      
      // Navigate to home
      router.replace('/(tabs)/home');
      
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User cancelled - don't show error
        logAuthEvent('Apple Sign-In cancelled by user');
        console.log('User cancelled Apple Sign-In');
      } else {
        logAuthEvent('Apple Sign-In error', { 
          message: error.message, 
          code: error.code,
          name: error.name 
        });
        console.error('Apple Sign-In error:', error);
        setError(error.message || 'Apple Sign-In failed. Please try again.');
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
        <ScrollView 
          contentContainerStyle={[
            styles.scrollContent,
            isTablet && styles.scrollContentTablet
          ]} 
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.formWrapper, isTablet && styles.formWrapperTablet]}>
            <View style={styles.headerSection}>
              <Logo size={isTablet ? 100 : 80} />
              <Text style={[styles.appTitle, isTablet && styles.appTitleTablet]}>Family Care</Text>
              <Text style={[styles.appSubtitle, isTablet && styles.appSubtitleTablet]}>Organizer</Text>
              <Text style={[styles.tagline, isTablet && styles.taglineTablet]}>Caring for your loved ones, together</Text>
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
                <View style={[styles.inputWrapper, isTablet && styles.inputWrapperTablet]}>
                  <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    testID="login-email-input"
                    style={[styles.input, isTablet && styles.inputTablet]}
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
                <View style={[styles.inputWrapper, isTablet && styles.inputWrapperTablet]}>
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    testID="login-password-input"
                    style={[styles.input, isTablet && styles.inputTablet]}
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
                style={[styles.primaryBtn, isTablet && styles.primaryBtnTablet, loading && styles.btnDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={[styles.primaryBtnText, isTablet && styles.primaryBtnTextTablet]}>Sign In</Text>
                )}
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                testID="google-auth-btn"
                style={[styles.googleBtn, isTablet && styles.googleBtnTablet]}
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
                  style={[styles.appleBtn, isTablet && styles.appleBtnTablet]}
                  onPress={handleAppleSignIn}
                />
              )}

              {/* Fallback Apple button for web/Android preview */}
              {Platform.OS !== 'ios' && (
                <TouchableOpacity
                  testID="apple-auth-btn"
                  style={[styles.appleBtnFallback, isTablet && styles.appleBtnFallbackTablet]}
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
  scrollContentTablet: { 
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  formWrapper: { flex: 1 },
  formWrapperTablet: {
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
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
  appTitleTablet: {
    fontSize: 40,
  },
  appSubtitle: {
    fontSize: FONT_SIZES.xl, fontWeight: '300',
    color: COLORS.primary, marginTop: -4,
  },
  appSubtitleTablet: {
    fontSize: 28,
  },
  tagline: {
    fontSize: FONT_SIZES.md, color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  taglineTablet: {
    fontSize: 18,
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
  inputWrapperTablet: {
    height: 56,
  },
  inputIcon: { marginRight: SPACING.sm },
  input: {
    flex: 1, fontSize: FONT_SIZES.md, color: COLORS.textPrimary,
  },
  inputTablet: {
    fontSize: 18,
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
  primaryBtnTablet: {
    paddingVertical: SPACING.lg,
  },
  btnDisabled: { opacity: 0.7 },
  primaryBtnText: {
    color: COLORS.white, fontSize: FONT_SIZES.md,
    fontWeight: '700', letterSpacing: 0.5,
  },
  primaryBtnTextTablet: {
    fontSize: 18,
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
  googleBtnTablet: {
    paddingVertical: SPACING.lg,
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
  appleBtnTablet: {
    height: 56,
  },
  appleBtnFallback: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#000000', borderRadius: RADIUS.full,
    paddingVertical: SPACING.md, marginTop: SPACING.sm,
  },
  appleBtnFallbackTablet: {
    paddingVertical: SPACING.lg,
  },
  appleBtnText: {
    fontSize: FONT_SIZES.md, fontWeight: '600',
    color: COLORS.white, marginLeft: SPACING.sm,
  },
  linkBtn: { alignItems: 'center', marginTop: SPACING.lg, paddingVertical: SPACING.sm },
  linkText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  linkBold: { color: COLORS.primary, fontWeight: '700' },
});
