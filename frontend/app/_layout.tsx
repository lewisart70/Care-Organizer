import { Stack } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { SubscriptionProvider } from '../src/context/SubscriptionContext';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="register" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add-recipient" options={{ presentation: 'modal' }} />
          <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
          <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
          <Stack.Screen name="medications" options={{ presentation: 'card' }} />
          <Stack.Screen name="medication-checker" options={{ presentation: 'modal' }} />
          <Stack.Screen name="emergency-contacts" options={{ presentation: 'card' }} />
          <Stack.Screen name="doctors" options={{ presentation: 'card' }} />
          <Stack.Screen name="daily-routine" options={{ presentation: 'card' }} />
          <Stack.Screen name="incidents" options={{ presentation: 'card' }} />
          <Stack.Screen name="bathing-tracker" options={{ presentation: 'card' }} />
          <Stack.Screen name="appointments" options={{ presentation: 'card' }} />
          <Stack.Screen name="nutrition" options={{ presentation: 'card' }} />
          <Stack.Screen name="legal-financial" options={{ presentation: 'card' }} />
          <Stack.Screen name="caregivers" options={{ presentation: 'card' }} />
          <Stack.Screen name="chat" options={{ presentation: 'card' }} />
          <Stack.Screen name="export-report" options={{ presentation: 'card' }} />
        </Stack>
      </SubscriptionProvider>
    </AuthProvider>
  );
}
