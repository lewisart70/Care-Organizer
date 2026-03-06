import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ExportReportScreen() {
  const { selectedRecipientId, token } = useAuth();
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);

  const handleExport = async () => {
    if (!selectedRecipientId) {
      Alert.alert('Error', 'No care recipient selected');
      return;
    }
    setDownloading(true);
    try {
      const url = `${BACKEND_URL}/api/export/${selectedRecipientId}/pdf`;
      // For web, open in new tab with auth
      if (typeof window !== 'undefined') {
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Export failed');
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = 'care_report.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        Alert.alert('Success', 'Report downloaded successfully!');
      } else {
        // Native: use Linking
        await Linking.openURL(url);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to export report');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity testID="back-export" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Export Report</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.content}>
        <View style={s.iconCircle}>
          <Ionicons name="document-text" size={48} color={COLORS.primary} />
        </View>
        <Text style={s.title}>Care Report PDF</Text>
        <Text style={s.description}>
          Generate a comprehensive PDF report containing all care data for your recipient. 
          Perfect for sharing with doctors, specialists, or other healthcare providers.
        </Text>

        <View style={s.includes}>
          <Text style={s.includesTitle}>Report includes:</Text>
          {[
            'Personal profile & medical info',
            'Medications with dosages',
            'Emergency contacts',
            'Doctors & specialists',
            'Appointments schedule',
            'Daily routine',
            'Recent caregiver notes',
            'Incident/fall logs',
            'Legal & financial checklist',
          ].map((item, i) => (
            <View key={i} style={s.includeRow}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              <Text style={s.includeText}>{item}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          testID="download-pdf-btn"
          style={[s.exportBtn, downloading && s.exportBtnDisabled]}
          onPress={handleExport}
          disabled={downloading}
        >
          {downloading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="download" size={20} color={COLORS.white} />
              <Text style={s.exportBtnText}>Download PDF Report</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  headerTitle: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.textPrimary },
  content: { flex: 1, paddingHorizontal: SPACING.lg, alignItems: 'center', paddingTop: SPACING.xl },
  iconCircle: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.primaryLight + '20',
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg,
  },
  title: { fontSize: FONT_SIZES.xxl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  description: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.lg },
  includes: { alignSelf: 'stretch', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.lg },
  includesTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  includeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  includeText: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, marginLeft: SPACING.sm },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl, width: '100%',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  exportBtnDisabled: { opacity: 0.6 },
  exportBtnText: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '700', marginLeft: SPACING.sm },
});
