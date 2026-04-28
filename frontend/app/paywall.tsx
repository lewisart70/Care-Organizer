import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription, FREE_LIMITS } from '../src/context/SubscriptionContext';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../src/constants/theme';
import { PurchasesPackage } from 'react-native-purchases';

// Required links for App Store compliance
const PRIVACY_POLICY_URL = 'https://familycareorganizer.com/privacy';
const TERMS_OF_USE_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

const FEATURES = [
  { icon: 'people', title: 'Unlimited Care Recipients', free: `${FREE_LIMITS.careRecipients} profile`, premium: 'Unlimited' },
  { icon: 'search', title: 'AI Resource Finder', free: `${FREE_LIMITS.aiQueriesPerMonth}/month`, premium: 'Unlimited' },
  { icon: 'document-text', title: 'PDF Reports', free: `${FREE_LIMITS.pdfExportsPerMonth}/month`, premium: 'Unlimited' },
  { icon: 'person-add', title: 'Care Team Invites', free: `${FREE_LIMITS.careTeamInvites} invite`, premium: 'Unlimited' },
  { icon: 'medical', title: 'Drug Interaction Checker', free: 'Limited', premium: 'Full Access' },
  { icon: 'cloud-upload', title: 'Cloud Backup', free: 'Basic', premium: 'Priority Sync' },
];

export default function PaywallScreen() {
  const router = useRouter();
  const { offerings, purchasePackage, restorePurchases, isSubscribed, loading } = useSubscription();
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    // Pre-select yearly package as best value
    if (offerings?.availablePackages) {
      const yearly = offerings.availablePackages.find(p => p.packageType === 'ANNUAL');
      const monthly = offerings.availablePackages.find(p => p.packageType === 'MONTHLY');
      setSelectedPackage(yearly || monthly || offerings.availablePackages[0]);
    }
  }, [offerings]);

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    setPurchasing(true);
    const success = await purchasePackage(selectedPackage);
    setPurchasing(false);
    if (success) {
      router.back();
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    const success = await restorePurchases();
    setRestoring(false);
    if (success) {
      router.back();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (isSubscribed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
          <Text style={styles.subscribedTitle}>You're a Premium Member!</Text>
          <Text style={styles.subscribedSubtitle}>Enjoy unlimited access to all features</Text>
          <TouchableOpacity style={styles.doneButton} onPress={() => router.back()}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Web fallback
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Ionicons name="phone-portrait" size={64} color={COLORS.primary} />
          <Text style={styles.webTitle}>Subscriptions Available on Mobile</Text>
          <Text style={styles.webSubtitle}>
            To subscribe to Premium, please open this app on your iPhone or Android device.
          </Text>
          <TouchableOpacity style={styles.doneButton} onPress={() => router.back()}>
            <Text style={styles.doneButtonText}>Got It</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.iconBadge}>
            <Ionicons name="star" size={32} color={COLORS.white} />
          </View>
          <Text style={styles.heroTitle}>Upgrade to Premium</Text>
          <Text style={styles.heroSubtitle}>
            Unlock unlimited features for better caregiving
          </Text>
        </View>

        {/* Trial Badge */}
        <View style={styles.trialBadge}>
          <Ionicons name="gift" size={20} color={COLORS.success} />
          <Text style={styles.trialText}>Start with 14 days FREE trial</Text>
        </View>

        {/* Features Comparison */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>What You Get</Text>
          {FEATURES.map((feature) => (
            <View key={feature.title} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon as any} size={20} color={COLORS.primary} />
              </View>
              <View style={styles.featureInfo}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <View style={styles.featureCompare}>
                  <Text style={styles.freeText}>Free: {feature.free}</Text>
                  <Ionicons name="arrow-forward" size={14} color={COLORS.textMuted} />
                  <Text style={styles.premiumText}>Premium: {feature.premium}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Package Selection */}
        {offerings?.availablePackages && (
          <View style={styles.packagesSection}>
            <Text style={styles.sectionTitle}>Choose Your Plan</Text>
            {offerings.availablePackages.map((pkg) => {
              const isSelected = selectedPackage?.identifier === pkg.identifier;
              const isYearly = pkg.packageType === 'ANNUAL';
              
              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  style={[styles.packageCard, isSelected && styles.packageCardSelected]}
                  onPress={() => setSelectedPackage(pkg)}
                  activeOpacity={0.7}
                >
                  {isYearly && (
                    <View style={styles.bestValueBadge}>
                      <Text style={styles.bestValueText}>BEST VALUE</Text>
                    </View>
                  )}
                  <View style={styles.packageRadio}>
                    <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </View>
                  <View style={styles.packageInfo}>
                    <Text style={styles.packageTitle}>
                      {isYearly ? 'Yearly' : 'Monthly'}
                    </Text>
                    <Text style={styles.packagePrice}>
                      {pkg.product.priceString}/{isYearly ? 'year' : 'month'}
                    </Text>
                    {isYearly && (
                      <Text style={styles.packageSavings}>Save ~20%</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Subscribe Button */}
        <TouchableOpacity
          style={[styles.subscribeButton, purchasing && styles.buttonDisabled]}
          onPress={handlePurchase}
          disabled={purchasing || !selectedPackage}
          activeOpacity={0.8}
        >
          {purchasing ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Text style={styles.subscribeButtonText}>Start 14-Day Free Trial</Text>
              <Text style={styles.subscribeButtonSubtext}>
                Then {selectedPackage?.product.priceString}/
                {selectedPackage?.packageType === 'ANNUAL' ? 'year' : 'month'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Restore */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={restoring}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.restoreText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>

        {/* Subscription Terms - Required by App Store */}
        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>Subscription Details</Text>
          <Text style={styles.termsDetail}>
            • <Text style={styles.termsBold}>Family Care Premium</Text> - Auto-renewable subscription
          </Text>
          <Text style={styles.termsDetail}>
            • <Text style={styles.termsBold}>Duration:</Text> Monthly or Yearly plans available
          </Text>
          <Text style={styles.termsDetail}>
            • <Text style={styles.termsBold}>Price:</Text> {selectedPackage?.product.priceString || 'See plan options above'} per {selectedPackage?.packageType === 'ANNUAL' ? 'year' : 'month'}
          </Text>
          <Text style={styles.termsDetail}>
            • Payment will be charged to your Apple ID account at confirmation of purchase
          </Text>
          <Text style={styles.termsDetail}>
            • Subscription automatically renews unless cancelled at least 24 hours before the end of the current period
          </Text>
          <Text style={styles.termsDetail}>
            • You can manage and cancel subscriptions in your Apple ID Account Settings
          </Text>
        </View>

        {/* Legal Links - Required by App Store */}
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.legalSeparator}>•</Text>
          <TouchableOpacity onPress={() => Linking.openURL(TERMS_OF_USE_URL)}>
            <Text style={styles.legalLink}>Terms of Use</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: SPACING.lg,
  },

  // Hero
  hero: { alignItems: 'center', paddingHorizontal: SPACING.xl, marginBottom: SPACING.lg },
  iconBadge: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.lg,
  },
  heroTitle: {
    fontSize: FONT_SIZES.xxl, fontWeight: '800',
    color: COLORS.textPrimary, marginBottom: SPACING.xs,
  },
  heroSubtitle: {
    fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: 'center',
  },

  // Trial Badge
  trialBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.success + '15',
    marginHorizontal: SPACING.xl, padding: SPACING.md,
    borderRadius: RADIUS.lg, gap: SPACING.sm,
  },
  trialText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.success },

  // Features
  featuresSection: { padding: SPACING.xl },
  sectionTitle: {
    fontSize: FONT_SIZES.lg, fontWeight: '700',
    color: COLORS.textPrimary, marginBottom: SPACING.md,
  },
  featureRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: SPACING.sm, gap: SPACING.md,
  },
  featureIcon: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  featureInfo: { flex: 1 },
  featureTitle: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
  featureCompare: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: 2 },
  freeText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  premiumText: { fontSize: FONT_SIZES.xs, color: COLORS.success, fontWeight: '600' },

  // Packages
  packagesSection: { paddingHorizontal: SPACING.xl },
  packageCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: SPACING.lg, marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 2, borderColor: COLORS.border,
    position: 'relative', overflow: 'hidden',
  },
  packageCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight + '30' },
  bestValueBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
    borderBottomLeftRadius: RADIUS.md,
  },
  bestValueText: { fontSize: 10, fontWeight: '800', color: COLORS.white },
  packageRadio: { marginRight: SPACING.md },
  radioOuter: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  radioOuterSelected: { borderColor: COLORS.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },
  packageInfo: { flex: 1 },
  packageTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  packagePrice: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  packageSavings: { fontSize: FONT_SIZES.xs, color: COLORS.success, fontWeight: '600', marginTop: 2 },

  // Subscribe Button
  subscribeButton: {
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.xl, marginTop: SPACING.lg,
    paddingVertical: SPACING.lg, borderRadius: RADIUS.lg,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  buttonDisabled: { opacity: 0.7 },
  subscribeButtonText: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.white },
  subscribeButtonSubtext: { fontSize: FONT_SIZES.sm, color: COLORS.white + 'CC', marginTop: 2 },

  // Restore
  restoreButton: { alignItems: 'center', paddingVertical: SPACING.lg },
  restoreText: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '600' },

  // Terms
  terms: {
    fontSize: FONT_SIZES.xs, color: COLORS.textMuted,
    textAlign: 'center', paddingHorizontal: SPACING.xl, lineHeight: 16,
  },
  termsSection: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  termsTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  termsDetail: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  termsBold: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  legalLink: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },

  // Subscribed state
  subscribedTitle: {
    fontSize: FONT_SIZES.xl, fontWeight: '800',
    color: COLORS.textPrimary, marginTop: SPACING.lg,
  },
  subscribedSubtitle: {
    fontSize: FONT_SIZES.md, color: COLORS.textSecondary,
    marginTop: SPACING.xs, textAlign: 'center',
  },
  doneButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.xxl,
    borderRadius: RADIUS.lg, marginTop: SPACING.xl,
  },
  doneButtonText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.white },

  // Web fallback
  webTitle: {
    fontSize: FONT_SIZES.xl, fontWeight: '800',
    color: COLORS.textPrimary, marginTop: SPACING.lg, textAlign: 'center',
  },
  webSubtitle: {
    fontSize: FONT_SIZES.md, color: COLORS.textSecondary,
    marginTop: SPACING.sm, textAlign: 'center', lineHeight: 22,
  },
});
