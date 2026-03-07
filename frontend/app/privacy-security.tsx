import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';

export default function PrivacySecurityScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity testID="back-privacy" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Privacy & Security</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={s.content}>
        {/* Security Shield Icon */}
        <View style={s.iconContainer}>
          <Ionicons name="shield-checkmark" size={64} color={COLORS.primary} />
        </View>

        {/* Main Security Statement */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Your Data is Protected</Text>
          <Text style={s.sectionText}>
            Family Care Organizer is designed with your privacy and security as our top priority. 
            We understand the sensitive nature of healthcare information and have implemented 
            industry-standard security measures to protect your data.
          </Text>
        </View>

        {/* Security Features */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Security Features</Text>
          
          <View style={s.featureItem}>
            <View style={s.featureIcon}>
              <Ionicons name="lock-closed" size={20} color={COLORS.success} />
            </View>
            <View style={s.featureContent}>
              <Text style={s.featureTitle}>Encrypted Data Transmission</Text>
              <Text style={s.featureText}>All data is transmitted using secure HTTPS encryption</Text>
            </View>
          </View>

          <View style={s.featureItem}>
            <View style={s.featureIcon}>
              <Ionicons name="key" size={20} color={COLORS.success} />
            </View>
            <View style={s.featureContent}>
              <Text style={s.featureTitle}>Password Protection</Text>
              <Text style={s.featureText}>Sensitive sections can be password-protected with encrypted storage</Text>
            </View>
          </View>

          <View style={s.featureItem}>
            <View style={s.featureIcon}>
              <Ionicons name="finger-print" size={20} color={COLORS.success} />
            </View>
            <View style={s.featureContent}>
              <Text style={s.featureTitle}>Secure Authentication</Text>
              <Text style={s.featureText}>JWT-based authentication with secure token management</Text>
            </View>
          </View>

          <View style={s.featureItem}>
            <View style={s.featureIcon}>
              <Ionicons name="people" size={20} color={COLORS.success} />
            </View>
            <View style={s.featureContent}>
              <Text style={s.featureTitle}>Access Control</Text>
              <Text style={s.featureText}>Only authorized caregivers can access care recipient information</Text>
            </View>
          </View>

          <View style={s.featureItem}>
            <View style={s.featureIcon}>
              <Ionicons name="server" size={20} color={COLORS.success} />
            </View>
            <View style={s.featureContent}>
              <Text style={s.featureTitle}>Secure Storage</Text>
              <Text style={s.featureText}>Data stored in encrypted databases with regular security updates</Text>
            </View>
          </View>
        </View>

        {/* Important Disclaimer */}
        <View style={[s.section, s.disclaimerSection]}>
          <View style={s.disclaimerHeader}>
            <Ionicons name="information-circle" size={24} color={COLORS.info} />
            <Text style={s.disclaimerTitle}>Important Notice</Text>
          </View>
          
          <Text style={s.disclaimerText}>
            This application is intended to be used as a <Text style={s.bold}>caregiver coordination tool</Text> to 
            help manage and organize care for individuals who require assistance.
          </Text>
          
          <Text style={s.disclaimerText}>
            All information entered into this app is <Text style={s.bold}>private and confidential</Text>. 
            Users are responsible for ensuring that sensitive information is:
          </Text>

          <View style={s.bulletList}>
            <View style={s.bulletItem}>
              <Text style={s.bullet}>•</Text>
              <Text style={s.bulletText}>Only shared with authorized caregivers</Text>
            </View>
            <View style={s.bulletItem}>
              <Text style={s.bullet}>•</Text>
              <Text style={s.bulletText}>Not disclosed without the consent of the care recipient or their Power of Attorney</Text>
            </View>
            <View style={s.bulletItem}>
              <Text style={s.bullet}>•</Text>
              <Text style={s.bulletText}>Handled in accordance with applicable privacy laws and regulations</Text>
            </View>
          </View>
        </View>

        {/* Consent Disclaimer */}
        <View style={[s.section, s.consentSection]}>
          <View style={s.disclaimerHeader}>
            <Ionicons name="document-text" size={24} color={COLORS.warning} />
            <Text style={[s.disclaimerTitle, { color: COLORS.warning }]}>Consent & Authorization</Text>
          </View>
          
          <Text style={s.disclaimerText}>
            By using this application, you confirm that you have obtained proper authorization 
            to access, record, and share information about the care recipient(s) in your care.
          </Text>
          
          <Text style={s.disclaimerText}>
            <Text style={s.bold}>Sensitive information</Text> including but not limited to medical records, 
            legal documents, financial information, and personal health data should only be shared 
            with individuals who have a legitimate need to know and have been authorized by the 
            care recipient or their legal representative (Power of Attorney).
          </Text>
        </View>

        {/* Caregiver Responsibility */}
        <View style={[s.section, s.responsibilitySection]}>
          <View style={s.disclaimerHeader}>
            <Ionicons name="heart" size={24} color={COLORS.error} />
            <Text style={[s.disclaimerTitle, { color: COLORS.error }]}>Caregiver Responsibility</Text>
          </View>
          
          <Text style={s.disclaimerText}>
            As a caregiver using this application, you acknowledge that:
          </Text>

          <View style={s.bulletList}>
            <View style={s.bulletItem}>
              <Text style={s.bullet}>1.</Text>
              <Text style={s.bulletText}>You are responsible for the accuracy of information you enter</Text>
            </View>
            <View style={s.bulletItem}>
              <Text style={s.bullet}>2.</Text>
              <Text style={s.bulletText}>You will maintain the confidentiality of all sensitive information</Text>
            </View>
            <View style={s.bulletItem}>
              <Text style={s.bullet}>3.</Text>
              <Text style={s.bulletText}>You will not share login credentials with unauthorized individuals</Text>
            </View>
            <View style={s.bulletItem}>
              <Text style={s.bullet}>4.</Text>
              <Text style={s.bulletText}>You will report any security concerns to the primary caregiver immediately</Text>
            </View>
            <View style={s.bulletItem}>
              <Text style={s.bullet}>5.</Text>
              <Text style={s.bulletText}>This app does not replace professional medical advice or legal counsel</Text>
            </View>
          </View>
        </View>

        {/* Contact */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Questions or Concerns?</Text>
          <Text style={s.sectionText}>
            If you have any questions about privacy, security, or data handling practices, 
            please contact the primary caregiver for your care team.
          </Text>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>Family Care Organizer</Text>
          <Text style={s.footerSubtext}>Helping families provide better care together</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  title: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.textPrimary },
  content: { flex: 1 },
  
  iconContainer: { alignItems: 'center', paddingVertical: SPACING.xl },
  
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  sectionText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 22 },
  
  featureItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.md },
  featureIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.success + '15', justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
  featureContent: { flex: 1 },
  featureTitle: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary },
  featureText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  
  disclaimerSection: { backgroundColor: COLORS.info + '10', padding: SPACING.lg, borderRadius: RADIUS.lg, marginHorizontal: SPACING.lg },
  consentSection: { backgroundColor: COLORS.warning + '10', padding: SPACING.lg, borderRadius: RADIUS.lg, marginHorizontal: SPACING.lg },
  responsibilitySection: { backgroundColor: COLORS.error + '10', padding: SPACING.lg, borderRadius: RADIUS.lg, marginHorizontal: SPACING.lg },
  
  disclaimerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, gap: SPACING.sm },
  disclaimerTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.info },
  disclaimerText: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, lineHeight: 22, marginBottom: SPACING.sm },
  
  bold: { fontWeight: '700' },
  
  bulletList: { marginTop: SPACING.sm },
  bulletItem: { flexDirection: 'row', marginBottom: SPACING.xs },
  bullet: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, width: 20, fontWeight: '700' },
  bulletText: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, lineHeight: 20 },
  
  footer: { alignItems: 'center', paddingVertical: SPACING.xxl, paddingHorizontal: SPACING.lg },
  footerText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.primary },
  footerSubtext: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 4 },
});
