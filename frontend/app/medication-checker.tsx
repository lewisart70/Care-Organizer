import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';

export default function MedicationCheckerScreen() {
  const { selectedRecipientId } = useAuth();
  const router = useRouter();
  const [meds, setMeds] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    if (!selectedRecipientId) { setLoading(false); return; }
    (async () => {
      try { setMeds(await api.get(`/care-recipients/${selectedRecipientId}/medications`)); }
      catch (e) {  } finally { setLoading(false); }
    })();
  }, [selectedRecipientId]));

  const toggleSelect = (name: string) => {
    setSelected(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const checkInteractions = async () => {
    if (selected.length < 2) { Alert.alert('Select Medications', 'Please select at least 2 medications to check'); return; }
    setChecking(true); setResult(null);
    try { setResult(await api.post('/ai/medication-interactions', { medications: selected })); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setChecking(false); }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity testID="back-checker" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
        <Text style={s.headerTitle}>Drug Interactions</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView>
        <View style={s.infoCard}>
          <Ionicons name="sparkles" size={20} color={COLORS.secondary} />
          <Text style={s.infoText}>Select 2 or more medications to check for potential interactions using AI</Text>
        </View>

        {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} /> :
          meds.length === 0 ? (
            <View style={s.empty}><Text style={s.emptyText}>No medications added yet. Add medications first.</Text></View>
          ) : (
            <View style={s.medList}>
              {meds.map(m => (
                <TouchableOpacity key={m.medication_id} testID={`select-med-${m.medication_id}`}
                  style={[s.medChip, selected.includes(m.name) && s.medChipActive]}
                  onPress={() => toggleSelect(m.name)}>
                  <Ionicons name={selected.includes(m.name) ? 'checkbox' : 'square-outline'} size={22} color={selected.includes(m.name) ? COLORS.primary : COLORS.textSecondary} />
                  <View style={s.medChipInfo}>
                    <Text style={[s.medChipName, selected.includes(m.name) && { color: COLORS.primary }]}>{m.name}</Text>
                    <Text style={s.medChipDose}>{m.dosage}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

        <TouchableOpacity testID="check-interactions-submit" style={[s.checkBtn, (selected.length < 2 || checking) && s.btnDisabled]}
          onPress={checkInteractions} disabled={selected.length < 2 || checking}>
          {checking ? <ActivityIndicator color={COLORS.white} /> : (
            <><Ionicons name="sparkles" size={18} color={COLORS.white} /><Text style={s.checkBtnText}>Check Interactions</Text></>
          )}
        </TouchableOpacity>

        {result && (
          <View style={s.resultSection}>
            <Text style={s.resultTitle}>Analysis Results</Text>
            {result.interactions?.map((inter: any, i: number) => (
              <View key={`interaction-${inter.severity}-${i}`} style={[s.interactionCard, { borderLeftColor: inter.severity === 'high' ? COLORS.error : inter.severity === 'moderate' ? COLORS.warning : COLORS.success }]}>
                <Text style={s.interMeds}>{Array.isArray(inter.medications) ? inter.medications.join(' + ') : inter.medications}</Text>
                <View style={[s.severityBadge, { backgroundColor: (inter.severity === 'high' ? COLORS.error : inter.severity === 'moderate' ? COLORS.warning : COLORS.success) + '15' }]}>
                  <Text style={[s.severityText, { color: inter.severity === 'high' ? COLORS.error : inter.severity === 'moderate' ? COLORS.warning : COLORS.success }]}>
                    {inter.severity?.toUpperCase()}
                  </Text>
                </View>
                <Text style={s.interDesc}>{inter.description}</Text>
              </View>
            ))}
            {result.summary && (
              <View style={s.summaryCard}>
                <Ionicons name="information-circle" size={20} color={COLORS.info} />
                <Text style={s.summaryText}>{typeof result.summary === 'string' ? result.summary : JSON.stringify(result.summary)}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  headerTitle: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.textPrimary },
  infoCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg, padding: SPACING.md, backgroundColor: COLORS.secondaryLight + '20', borderRadius: RADIUS.lg, marginBottom: SPACING.md },
  infoText: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.secondaryDark, marginLeft: SPACING.sm, lineHeight: 20 },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  medList: { paddingHorizontal: SPACING.lg },
  medChip: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, marginBottom: SPACING.sm, borderWidth: 1.5, borderColor: COLORS.border },
  medChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight + '10' },
  medChipInfo: { marginLeft: SPACING.sm },
  medChipName: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
  medChipDose: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  checkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: SPACING.md, marginHorizontal: SPACING.lg, marginTop: SPACING.md },
  btnDisabled: { opacity: 0.5 },
  checkBtnText: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '700', marginLeft: SPACING.sm },
  resultSection: { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg, marginBottom: SPACING.xxl },
  resultTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },
  interactionCard: { padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, marginBottom: SPACING.sm, borderLeftWidth: 4 },
  interMeds: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  severityBadge: { alignSelf: 'flex-start', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full, marginTop: 4 },
  severityText: { fontSize: 10, fontWeight: '800' },
  interDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.sm, lineHeight: 20 },
  summaryCard: { flexDirection: 'row', padding: SPACING.md, backgroundColor: COLORS.info + '10', borderRadius: RADIUS.lg, marginTop: SPACING.sm },
  summaryText: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, marginLeft: SPACING.sm, lineHeight: 20 },
});
