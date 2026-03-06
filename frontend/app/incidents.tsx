import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Modal, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';

export default function IncidentsScreen() {
  const { selectedRecipientId } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ incident_type: 'fall', description: '', severity: 'moderate', location: '', injuries: '', action_taken: '' });
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    if (!selectedRecipientId) { setLoading(false); return; }
    try { setItems(await api.get(`/care-recipients/${selectedRecipientId}/incidents`)); } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [selectedRecipientId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const handleAdd = async () => {
    if (!form.description.trim()) { Alert.alert('Required', 'Description is required'); return; }
    setSaving(true);
    try { await api.post(`/care-recipients/${selectedRecipientId}/incidents`, form); setShowAdd(false); setForm({ incident_type: 'fall', description: '', severity: 'moderate', location: '', injuries: '', action_taken: '' }); await load(); }
    catch (e: any) { Alert.alert('Error', e.message); } finally { setSaving(false); }
  };
  const severityColor = (s: string) => s === 'severe' ? COLORS.error : s === 'moderate' ? COLORS.warning : COLORS.success;
  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}><TouchableOpacity testID="back-incidents" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity><Text style={s.title}>Incidents & Falls</Text><TouchableOpacity testID="add-incident-btn" onPress={() => setShowAdd(true)}><Ionicons name="add-circle" size={28} color={COLORS.primary} /></TouchableOpacity></View>
      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={COLORS.primary} />}>
        {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} /> :
          items.length === 0 ? (<View style={s.empty}><Ionicons name="alert-circle-outline" size={48} color={COLORS.primaryLight} /><Text style={s.emptyTitle}>No incidents recorded</Text></View>) :
          items.map(i => (
            <View key={i.incident_id} style={[s.card, { borderLeftColor: severityColor(i.severity) }]}>
              <View style={s.row}><View style={[s.badge, { backgroundColor: severityColor(i.severity) + '15' }]}><Text style={[s.badgeText, { color: severityColor(i.severity) }]}>{i.severity?.toUpperCase()}</Text></View><Text style={s.type}>{i.incident_type}</Text></View>
              <Text style={s.desc}>{i.description}</Text>
              {i.injuries && <Text style={s.detail}>Injuries: {i.injuries}</Text>}
              {i.action_taken && <Text style={s.detail}>Action: {i.action_taken}</Text>}
              <Text style={s.meta}>{i.reported_by} • {i.created_at ? new Date(i.created_at).toLocaleDateString() : ''}</Text>
            </View>
          ))}
      </ScrollView>
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.mHeader}><TouchableOpacity onPress={() => setShowAdd(false)}><Text style={s.cancel}>Cancel</Text></TouchableOpacity><Text style={s.mTitle}>Log Incident</Text><TouchableOpacity testID="save-incident-btn" onPress={handleAdd} disabled={saving}>{saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={s.save}>Save</Text>}</TouchableOpacity></View>
          <ScrollView style={s.mBody}>
            <Text style={s.fl}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
              {['fall', 'medical', 'behavioral', 'medication', 'other'].map(t => (<TouchableOpacity key={t} testID={`type-${t}`} style={[s.chip, form.incident_type === t && s.chipActive]} onPress={() => setForm({ ...form, incident_type: t })}><Text style={[s.chipText, form.incident_type === t && s.chipTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text></TouchableOpacity>))}
            </ScrollView>
            <Text style={s.fl}>Severity</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
              {['mild', 'moderate', 'severe'].map(sv => (<TouchableOpacity key={sv} testID={`sev-${sv}`} style={[s.chip, form.severity === sv && { backgroundColor: severityColor(sv) }]} onPress={() => setForm({ ...form, severity: sv })}><Text style={[s.chipText, form.severity === sv && { color: COLORS.white }]}>{sv.charAt(0).toUpperCase() + sv.slice(1)}</Text></TouchableOpacity>))}
            </ScrollView>
            {[{ k: 'description', l: 'Description *', p: 'What happened?', ml: true },{ k: 'location', l: 'Location', p: 'Where did it happen?' },{ k: 'injuries', l: 'Injuries', p: 'Describe any injuries' },{ k: 'action_taken', l: 'Action Taken', p: 'What was done?', ml: true }].map(({ k, l, p, ml }) => (
              <View key={k} style={s.fg}><Text style={s.fl}>{l}</Text><TextInput testID={`inc-${k}`} style={ml ? s.ta : s.fi} placeholder={p} placeholderTextColor={COLORS.border} value={(form as any)[k]} onChangeText={v => setForm({ ...form, [k]: v })} multiline={!!ml} textAlignVertical={ml ? 'top' : undefined} /></View>))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md }, title: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.textPrimary },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl }, emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  card: { marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderLeftWidth: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 }, badge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full, marginRight: SPACING.sm }, badgeText: { fontSize: 10, fontWeight: '800' }, type: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'capitalize' },
  desc: { fontSize: FONT_SIZES.md, color: COLORS.textPrimary, lineHeight: 20 }, detail: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 }, meta: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: SPACING.sm, fontStyle: 'italic' },
  modal: { flex: 1, backgroundColor: COLORS.background }, mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border }, mTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary }, cancel: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary }, save: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '700' }, mBody: { padding: SPACING.lg },
  fg: { marginBottom: SPACING.md }, fl: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  fi: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: SPACING.md, height: 48, fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
  ta: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, padding: SPACING.md, fontSize: FONT_SIZES.md, color: COLORS.textPrimary, minHeight: 80 },
  chip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginRight: SPACING.sm }, chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary }, chipText: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.textSecondary }, chipTextActive: { color: COLORS.white },
});
