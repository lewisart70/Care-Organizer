import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Modal, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';

export default function BathingTrackerScreen() {
  const { selectedRecipientId } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], bath_type: 'full', notes: '', assisted_by: '' });
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    if (!selectedRecipientId) { setLoading(false); return; }
    try { setItems(await api.get(`/care-recipients/${selectedRecipientId}/bathing`)); } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [selectedRecipientId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const handleAdd = async () => {
    setSaving(true);
    try { await api.post(`/care-recipients/${selectedRecipientId}/bathing`, form); setShowAdd(false); setForm({ date: new Date().toISOString().split('T')[0], bath_type: 'full', notes: '', assisted_by: '' }); await load(); }
    catch (e: any) { Alert.alert('Error', e.message); } finally { setSaving(false); }
  };
  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}><TouchableOpacity testID="back-bathing" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity><Text style={s.title}>Bathing Tracker</Text><TouchableOpacity testID="add-bathing-btn" onPress={() => setShowAdd(true)}><Ionicons name="add-circle" size={28} color={COLORS.primary} /></TouchableOpacity></View>
      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={COLORS.primary} />}>
        {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} /> :
          items.length === 0 ? (<View style={s.empty}><Ionicons name="water-outline" size={48} color={COLORS.primaryLight} /><Text style={s.emptyTitle}>No bathing records</Text></View>) :
          items.map(i => (<View key={i.bathing_id} style={s.card}><View style={s.row}><Ionicons name="water" size={20} color="#9B59B6" /><Text style={s.date}>{i.date}</Text><View style={s.typeBadge}><Text style={s.typeText}>{i.bath_type}</Text></View></View>{i.assisted_by && <Text style={s.sub}>Assisted by: {i.assisted_by}</Text>}{i.notes && <Text style={s.sub}>{i.notes}</Text>}</View>))}
      </ScrollView>
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}><View style={s.mHeader}><TouchableOpacity onPress={() => setShowAdd(false)}><Text style={s.cancel}>Cancel</Text></TouchableOpacity><Text style={s.mTitle}>Log Bathing</Text><TouchableOpacity testID="save-bathing-btn" onPress={handleAdd} disabled={saving}>{saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={s.save}>Save</Text>}</TouchableOpacity></View>
          <ScrollView style={s.mBody}>
            <View style={s.fg}><Text style={s.fl}>Date</Text><TextInput testID="bath-date" style={s.fi} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.border} value={form.date} onChangeText={v => setForm({ ...form, date: v })} /></View>
            <Text style={s.fl}>Type</Text><ScrollView horizontal style={{ marginBottom: SPACING.md }}>{['full', 'sponge', 'shower', 'partial'].map(t => (<TouchableOpacity key={t} testID={`bath-type-${t}`} style={[s.chip, form.bath_type === t && s.chipActive]} onPress={() => setForm({ ...form, bath_type: t })}><Text style={[s.chipText, form.bath_type === t && s.chipTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text></TouchableOpacity>))}</ScrollView>
            <View style={s.fg}><Text style={s.fl}>Assisted By</Text><TextInput testID="bath-assisted" style={s.fi} placeholder="Caregiver name" placeholderTextColor={COLORS.border} value={form.assisted_by} onChangeText={v => setForm({ ...form, assisted_by: v })} /></View>
            <View style={s.fg}><Text style={s.fl}>Notes</Text><TextInput testID="bath-notes" style={s.ta} placeholder="Any notes" placeholderTextColor={COLORS.border} value={form.notes} onChangeText={v => setForm({ ...form, notes: v })} multiline textAlignVertical="top" /></View>
          </ScrollView></SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md }, title: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.textPrimary },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl }, emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  card: { marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg }, row: { flexDirection: 'row', alignItems: 'center' }, date: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary, marginLeft: SPACING.sm, flex: 1 },
  typeBadge: { backgroundColor: '#9B59B6' + '15', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full }, typeText: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: '#9B59B6', textTransform: 'capitalize' },
  sub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 4, marginLeft: 32 },
  modal: { flex: 1, backgroundColor: COLORS.background }, mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border }, mTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary }, cancel: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary }, save: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '700' }, mBody: { padding: SPACING.lg },
  fg: { marginBottom: SPACING.md }, fl: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  fi: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: SPACING.md, height: 48, fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
  ta: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, padding: SPACING.md, fontSize: FONT_SIZES.md, color: COLORS.textPrimary, minHeight: 80 },
  chip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginRight: SPACING.sm }, chipActive: { backgroundColor: '#9B59B6', borderColor: '#9B59B6' }, chipText: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.textSecondary }, chipTextActive: { color: COLORS.white },
});
