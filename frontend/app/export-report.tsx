import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, ScrollView, 
  ActivityIndicator, TextInput, Alert, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';

interface Section {
  id: string;
  name: string;
  icon: string;
}

const TIME_PERIODS = [
  { id: '7_days', name: 'Last 7 Days', icon: 'calendar-outline' },
  { id: '30_days', name: 'Last 30 Days', icon: 'calendar' },
];

const DELIVERY_METHODS = [
  { id: 'download', name: 'Download PDF', icon: 'download-outline', description: 'Save to your device' },
  { id: 'email_self', name: 'Email to Me', icon: 'mail-outline', description: 'Send to your account email' },
  { id: 'email_other', name: 'Email to Someone', icon: 'send-outline', description: 'Send to any email address' },
];

export default function ExportReportScreen() {
  const router = useRouter();
  const { selectedRecipientId, user } = useAuth();
  
  // State
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [timePeriod, setTimePeriod] = useState('7_days');
  const [deliveryMethod, setDeliveryMethod] = useState('download');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSections, setLoadingSections] = useState(true);

  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    if (!selectedRecipientId) {
      setLoadingSections(false);
      return;
    }
    
    try {
      const result = await api.get(`/care-recipients/${selectedRecipientId}/export-sections`);
      setSections(result.sections || []);
      // Select all sections by default
      setSelectedSections((result.sections || []).map((s: Section) => s.id));
    } catch (e) {
      console.error('Failed to load sections:', e);
      // Fallback sections
      const fallback = [
        { id: 'medications', name: 'Medications', icon: 'medical' },
        { id: 'appointments', name: 'Appointments', icon: 'calendar' },
        { id: 'doctors', name: 'Doctors & Specialists', icon: 'person' },
        { id: 'routines', name: 'Daily Routines', icon: 'time' },
        { id: 'incidents', name: 'Incidents & Falls', icon: 'alert-circle' },
        { id: 'notes', name: 'Caregiver Notes', icon: 'document-text' },
        { id: 'bathing', name: 'Bathing Records', icon: 'water' },
        { id: 'emergency_contacts', name: 'Emergency Contacts', icon: 'call' },
      ];
      setSections(fallback);
      setSelectedSections(fallback.map(s => s.id));
    } finally {
      setLoadingSections(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setSelectedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(s => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  const selectAllSections = () => {
    setSelectedSections(sections.map(s => s.id));
  };

  const clearAllSections = () => {
    setSelectedSections([]);
  };

  const handleExport = async () => {
    if (selectedSections.length === 0) {
      Alert.alert('Select Sections', 'Please select at least one section to include in the report.');
      return;
    }

    if (deliveryMethod === 'email_other' && !recipientEmail.trim()) {
      Alert.alert('Email Required', 'Please enter the recipient email address.');
      return;
    }

    if (deliveryMethod === 'email_other' && !recipientEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      if (deliveryMethod === 'download') {
        // For mobile download, use a different approach
        const token = api.getToken();
        
        // First, request the PDF and get it as base64 from a modified endpoint
        // We'll use email_self but handle it differently
        try {
          const response = await fetch(
            `${api.baseUrl}/care-recipients/${selectedRecipientId}/export-report`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                sections: selectedSections,
                time_period: timePeriod,
                delivery_method: 'download',
              }),
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to generate report');
          }

          // Get the response as array buffer and convert to base64
          const arrayBuffer = await response.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          
          const filename = `care_report_${new Date().toISOString().split('T')[0]}.pdf`;
          const fileUri = FileSystem.documentDirectory + filename;
          
          await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          // Share the file
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/pdf',
              dialogTitle: 'Save Care Report',
            });
            Alert.alert('Success', 'Report generated! You can save or share the PDF.');
          } else {
            Alert.alert('Success', `Report saved to ${filename}`);
          }
        } catch (fetchError: any) {
          console.error('Fetch error:', fetchError);
          throw new Error(fetchError.message || 'Network request failed');
        }
        
      } else {
        // For email, use standard API call
        const result = await api.post(`/care-recipients/${selectedRecipientId}/export-report`, {
          sections: selectedSections,
          time_period: timePeriod,
          delivery_method: deliveryMethod,
          recipient_email: deliveryMethod === 'email_other' ? recipientEmail.trim() : undefined,
        });

        Alert.alert('Success', result.message || 'Report sent successfully!');
      }
    } catch (e: any) {
      console.error('Export error:', e);
      Alert.alert('Export Failed', e.message || 'Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedRecipientId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Export Report</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color={COLORS.border} />
          <Text style={styles.emptyTitle}>No Care Recipient Selected</Text>
          <Text style={styles.emptyText}>Please select a care recipient first</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity testID="back-export" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Export Report</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="document-text" size={24} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Generate a professional PDF report with selected care information to share with family, doctors, or other caregivers.
          </Text>
        </View>

        {/* Section Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Select Sections</Text>
            <View style={styles.selectActions}>
              <TouchableOpacity onPress={selectAllSections}>
                <Text style={styles.selectAction}>All</Text>
              </TouchableOpacity>
              <Text style={styles.selectDivider}>|</Text>
              <TouchableOpacity onPress={clearAllSections}>
                <Text style={styles.selectAction}>None</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {loadingSections ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <View style={styles.sectionsGrid}>
              {sections.map(section => (
                <TouchableOpacity
                  key={section.id}
                  testID={`section-${section.id}`}
                  style={[
                    styles.sectionCard,
                    selectedSections.includes(section.id) && styles.sectionCardActive
                  ]}
                  onPress={() => toggleSection(section.id)}
                >
                  <Ionicons 
                    name={section.icon as any} 
                    size={20} 
                    color={selectedSections.includes(section.id) ? COLORS.primary : COLORS.textSecondary} 
                  />
                  <Text style={[
                    styles.sectionCardText,
                    selectedSections.includes(section.id) && styles.sectionCardTextActive
                  ]}>{section.name}</Text>
                  {selectedSections.includes(section.id) && (
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} style={styles.checkIcon} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Time Period */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time Period</Text>
          <Text style={styles.sectionSubtitle}>For notes and incidents</Text>
          <View style={styles.periodRow}>
            {TIME_PERIODS.map(period => (
              <TouchableOpacity
                key={period.id}
                testID={`period-${period.id}`}
                style={[
                  styles.periodCard,
                  timePeriod === period.id && styles.periodCardActive
                ]}
                onPress={() => setTimePeriod(period.id)}
              >
                <Ionicons 
                  name={period.icon as any} 
                  size={20} 
                  color={timePeriod === period.id ? COLORS.white : COLORS.textSecondary} 
                />
                <Text style={[
                  styles.periodText,
                  timePeriod === period.id && styles.periodTextActive
                ]}>{period.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Delivery Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Method</Text>
          <View style={styles.deliveryOptions}>
            {DELIVERY_METHODS.map(method => (
              <TouchableOpacity
                key={method.id}
                testID={`delivery-${method.id}`}
                style={[
                  styles.deliveryCard,
                  deliveryMethod === method.id && styles.deliveryCardActive
                ]}
                onPress={() => setDeliveryMethod(method.id)}
              >
                <View style={[
                  styles.deliveryIconContainer,
                  deliveryMethod === method.id && styles.deliveryIconContainerActive
                ]}>
                  <Ionicons 
                    name={method.icon as any} 
                    size={24} 
                    color={deliveryMethod === method.id ? COLORS.white : COLORS.primary} 
                  />
                </View>
                <View style={styles.deliveryInfo}>
                  <Text style={[
                    styles.deliveryName,
                    deliveryMethod === method.id && styles.deliveryNameActive
                  ]}>{method.name}</Text>
                  <Text style={styles.deliveryDesc}>{method.description}</Text>
                </View>
                {deliveryMethod === method.id && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Email Input (if email_other selected) */}
        {deliveryMethod === 'email_other' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recipient Email</Text>
            <TextInput
              testID="recipient-email"
              style={styles.emailInput}
              placeholder="Enter email address"
              placeholderTextColor={COLORS.border}
              value={recipientEmail}
              onChangeText={setRecipientEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        )}

        {/* Export Button */}
        <TouchableOpacity
          testID="export-btn"
          style={[styles.exportButton, loading && styles.exportButtonDisabled]}
          onPress={handleExport}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name={deliveryMethod === 'download' ? 'download' : 'send'} size={20} color={COLORS.white} />
              <Text style={styles.exportButtonText}>
                {deliveryMethod === 'download' ? 'Generate & Download' : 'Generate & Send'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Privacy Note */}
        <View style={styles.privacyNote}>
          <Ionicons name="shield-checkmark" size={16} color={COLORS.textSecondary} />
          <Text style={styles.privacyText}>
            Reports contain sensitive care information. Please share only with authorized individuals.
          </Text>
        </View>

        <View style={{ height: SPACING.xxl }} />
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
  
  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  infoText: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, lineHeight: 20 },
  
  // Section
  section: { marginHorizontal: SPACING.lg, marginTop: SPACING.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  sectionSubtitle: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2, marginBottom: SPACING.sm },
  selectActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  selectAction: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: '600' },
  selectDivider: { color: COLORS.border },
  
  // Sections Grid
  sectionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  sectionCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    gap: SPACING.xs,
  },
  sectionCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  sectionCardText: { flex: 1, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: '600' },
  sectionCardTextActive: { color: COLORS.primary },
  checkIcon: { marginLeft: 'auto' },
  
  // Time Period
  periodRow: { flexDirection: 'row', gap: SPACING.sm },
  periodCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  periodCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  periodText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textSecondary },
  periodTextActive: { color: COLORS.white },
  
  // Delivery Options
  deliveryOptions: { gap: SPACING.sm },
  deliveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  deliveryCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },
  deliveryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryIconContainerActive: {
    backgroundColor: COLORS.primary,
  },
  deliveryInfo: { flex: 1 },
  deliveryName: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  deliveryNameActive: { color: COLORS.primary },
  deliveryDesc: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  
  // Email Input
  emailInput: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 48,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  
  // Export Button
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  exportButtonDisabled: { opacity: 0.7 },
  exportButtonText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.white },
  
  // Privacy Note
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  privacyText: { flex: 1, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, lineHeight: 16 },
  
  // Empty State
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  emptyText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
});
