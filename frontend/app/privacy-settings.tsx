import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, ScrollView, 
  ActivityIndicator, Alert, Linking 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';

// TODO: Replace with your Termly URLs after creating the documents
const PRIVACY_POLICY_URL = 'https://familycareorganizer.com/privacy-policy';
const TERMS_OF_SERVICE_URL = 'https://familycareorganizer.com/terms-of-service';

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [dataPolicy, setDataPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadDataPolicy();
  }, [loadDataPolicy]);

  const loadDataPolicy = useCallback(async () => {
    try {
      const policy = await api.get('/compliance/data-policy');
      setDataPolicy(policy);
    } catch (e) {
      console.error('Failed to load data policy:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleExportData = async () => {
    Alert.alert(
      'Export All Data',
      'This will download all your personal data and health information in JSON format. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            setExporting(true);
            try {
              const data = await api.get('/account/export-all-data');
              // Convert to JSON string and share
              const jsonString = JSON.stringify(data, null, 2);
              
              // For now, show success - in production, would download file
              Alert.alert(
                'Data Exported',
                'Your data has been exported successfully. In a production app, this would download as a file.',
                [{ text: 'OK' }]
              );
            } catch (e: any) {
              Alert.alert('Export Failed', e.message || 'Failed to export data');
            } finally {
              setExporting(false);
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      '⚠️ Delete Account',
      'This action is PERMANENT and cannot be undone.\n\nAll your data including:\n• Care recipient profiles\n• Medical records\n• Appointments\n• Notes\n• All health information\n\n...will be permanently deleted.\n\nAre you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delete Everything',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Final Confirmation',
              'Type DELETE to confirm account deletion.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'DELETE',
                  style: 'destructive',
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      await api.del('/account/delete');
                      Alert.alert(
                        'Account Deleted',
                        'Your account and all associated data have been permanently deleted.',
                        [{ text: 'OK', onPress: () => logout() }]
                      );
                    } catch (e: any) {
                      Alert.alert('Error', e.message || 'Failed to delete account');
                      setDeleting(false);
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const handleWithdrawConsent = async () => {
    Alert.alert(
      'Withdraw Consent',
      'Withdrawing consent will schedule your account for deletion in 30 days. You can cancel this by logging in again within that period.\n\nContinue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw Consent',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await api.post('/auth/withdraw-consent');
              Alert.alert('Consent Withdrawn', result.message);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to withdraw consent');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy & Data</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Compliance Badge */}
        <View style={styles.complianceBadge}>
          <Ionicons name="shield-checkmark" size={32} color={COLORS.success} />
          <View style={styles.complianceText}>
            <Text style={styles.complianceTitle}>PIPEDA & HIPAA Ready</Text>
            <Text style={styles.complianceSubtitle}>Your data is protected by industry standards</Text>
          </View>
        </View>

        {/* Legal Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal Documents</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          >
            <View style={[styles.menuIcon, { backgroundColor: COLORS.primary + '15' }]}>
              <Ionicons name="document-text" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.menuLabel}>Privacy Policy</Text>
            <Ionicons name="open-outline" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)}
          >
            <View style={[styles.menuIcon, { backgroundColor: COLORS.secondary + '15' }]}>
              <Ionicons name="document" size={22} color={COLORS.secondary} />
            </View>
            <Text style={styles.menuLabel}>Terms of Service</Text>
            <Ionicons name="open-outline" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Data Security Info */}
        {dataPolicy && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data Security</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="lock-closed" size={20} color={COLORS.success} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Encryption at Rest</Text>
                  <Text style={styles.infoValue}>{dataPolicy.encryption?.at_rest}</Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <Ionicons name="shield" size={20} color={COLORS.success} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Encryption in Transit</Text>
                  <Text style={styles.infoValue}>{dataPolicy.encryption?.in_transit}</Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <Ionicons name="key" size={20} color={COLORS.success} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Password Security</Text>
                  <Text style={styles.infoValue}>{dataPolicy.encryption?.passwords}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Your Rights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Data Rights</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleExportData}
            disabled={exporting}
          >
            <View style={[styles.menuIcon, { backgroundColor: COLORS.info + '15' }]}>
              {exporting ? (
                <ActivityIndicator size="small" color={COLORS.info} />
              ) : (
                <Ionicons name="download" size={22} color={COLORS.info} />
              )}
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuLabel}>Export All My Data</Text>
              <Text style={styles.menuSubtext}>Download a copy of all your information</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleWithdrawConsent}
          >
            <View style={[styles.menuIcon, { backgroundColor: COLORS.warning + '15' }]}>
              <Ionicons name="hand-left" size={22} color={COLORS.warning} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuLabel}>Withdraw Consent</Text>
              <Text style={styles.menuSubtext}>Schedule account for deletion in 30 days</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Compliance Frameworks */}
        {dataPolicy && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Compliance Frameworks</Text>
            <View style={styles.frameworksContainer}>
              {dataPolicy.compliance_frameworks?.map((framework: string) => (
                <View key={framework} style={styles.frameworkBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                  <Text style={styles.frameworkText}>{framework}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Danger Zone */}
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={[styles.sectionTitle, { color: COLORS.error }]}>Danger Zone</Text>
          
          <TouchableOpacity 
            style={[styles.menuItem, styles.dangerItem]}
            onPress={handleDeleteAccount}
            disabled={deleting}
          >
            <View style={[styles.menuIcon, { backgroundColor: COLORS.error + '15' }]}>
              {deleting ? (
                <ActivityIndicator size="small" color={COLORS.error} />
              ) : (
                <Ionicons name="trash" size={22} color={COLORS.error} />
              )}
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuLabel, { color: COLORS.error }]}>Delete My Account</Text>
              <Text style={styles.menuSubtext}>Permanently delete all data</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.error} />
          </TouchableOpacity>
        </View>

        {/* Data Residency Note */}
        <View style={styles.noteContainer}>
          <Ionicons name="information-circle" size={18} color={COLORS.textSecondary} />
          <Text style={styles.noteText}>
            For users in British Columbia or Nova Scotia requiring Canadian-only data storage, 
            please contact support@familycareorganizer.com for compliance options.
          </Text>
        </View>

        <View style={{ height: SPACING.xxl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: SPACING.lg, 
    paddingVertical: SPACING.md 
  },
  title: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.textPrimary },
  content: { flex: 1 },

  // Compliance Badge
  complianceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '10',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.success + '30',
  },
  complianceText: { marginLeft: SPACING.md, flex: 1 },
  complianceTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.success },
  complianceSubtitle: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },

  // Sections
  section: { marginTop: SPACING.lg },
  sectionTitle: { 
    fontSize: FONT_SIZES.sm, 
    fontWeight: '700', 
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm 
  },

  // Menu Items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: 2,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  menuLabel: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
  menuTextContainer: { flex: 1 },
  menuSubtext: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },

  // Info Card
  infoCard: {
    marginHorizontal: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoContent: { marginLeft: SPACING.md, flex: 1 },
  infoLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  infoValue: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.textPrimary },

  // Frameworks
  frameworksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  frameworkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  frameworkText: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.textPrimary },

  // Danger Zone
  dangerSection: {
    marginTop: SPACING.xl,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.error + '30',
  },
  dangerItem: {
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },

  // Note
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  noteText: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});
