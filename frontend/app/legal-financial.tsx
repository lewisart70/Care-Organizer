import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Modal, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';

export default function LegalFinancialScreen() {
  const { selectedRecipientId } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ item_type: 'legal', title: '', description: '', status: 'pending', due_date: '', contact_person: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    if (!selectedRecipientId) { setLoading(false); return; }
    try { setItems(await api.get(`/care-recipients/${selectedRecipientId}/legal-financial`)); } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [selectedRecipientId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const handleAdd = async () => {
    if (!form.title.trim()) { Alert.alert('Required', 'Title required'); return; }
    setSaving(true);
    try { await api.post(`/care-recipients/${selectedRecipientId}/legal-financial`, form); setShowAdd(false); setForm({ item_type: 'legal', title: '', description: '', status: 'pending', due_date: '', contact_person: '', notes: '' }); await load(); }
    catch (e: any) { Alert.alert('Error', e.message); } finally { setSaving(false); }
  };
  const statusColor = (st: string) => st === 'completed' ? COLORS.success : st === 'in_progress' ? COLORS.warning : COLORS.textSecondary;
  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}><TouchableOpacity testID="back-legal" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity><Text style={s.title}>Legal & Financial</Text><TouchableOpacity testID="add-legal-btn" onPress={() => setShowAdd(true)}><Ionicons name="add-circle" size={28} color={COLORS.primary} /></TouchableOpacity></View>
      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={COLORS.primary} />}>
        {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} /> :
          items.length === 0 ? (<View style={s.empty}><Ionicons name="document-lock-outline" size={48} color={COLORS.primaryLight} /><Text style={s.emptyTitle}>No legal/financial items</Text></View>) :
          items.map(i => (<View key={i.item_id} style={s.card}>
            <View style={s.row}><View style={[s.typeBadge, { backgroundColor: i.item_type === 'legal' ? COLORS.info + '15' : COLORS.success + '15' }]}><Text style={[s.typeText, { color: i.item_type === 'legal' ? COLORS.info : COLORS.success }]}>{i.item_type}</Text></View>
            <View style={[s.statusBadge, { backgroundColor: statusColor(i.status) + '15' }]}><Text style={[s.statusText, { color: statusColor(i.status) }]}>{i.status?.replace('_', ' ')}</Text></View></View>
            <Text style={s.cardTitle}>{i.title}</Text>
            {i.description && <Text style={s.cardDesc}>{i.description}</Text>}
            {i.contact_person && <Text style={s.sub}>Contact: {i.contact_person}</Text>}
            {i.due_date && <Text style={s.sub}>Due: {i.due_date}</Text>}
          </View>))}
      </ScrollView>
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}><View style={s.mHeader}><TouchableOpacity onPress={() => setShowAdd(false)}><Text style={s.cancel}>Cancel</Text></TouchableOpacity><Text style={s.mTitle}>Add Item</Text><TouchableOpacity testID="save-legal-btn" onPress={handleAdd} disabled={saving}>{saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={s.save}>Save</Text>}</TouchableOpacity></View>
          <ScrollView style={s.mBody}>
            <Text style={s.fl}>Type</Text><ScrollView horizontal style={{ marginBottom: SPACING.md }}>{['legal', 'financial', 'insurance', 'estate'].map(t => (<TouchableOpacity key={t} testID={`lf-type-${t}`} style={[s.chip, form.item_type === t && s.chipActive]} onPress={() => setForm({ ...form, item_type: t })}><Text style={[s.chipText, form.item_type === t && s.chipTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text></TouchableOpacity>))}</ScrollView>
            <Text style={s.fl}>Status</Text><ScrollView horizontal style={{ marginBottom: SPACING.md }}>{['pending', 'in_progress', 'completed'].map(st => (<TouchableOpacity key={st} testID={`lf-status-${st}`} style={[s.chip, form.status === st && { backgroundColor: statusColor(st) }]} onPress={() => setForm({ ...form, status: st })}><Text style={[s.chipText, form.status === st && { color: COLORS.white }]}>{st.replace('_', ' ')}</Text></TouchableOpacity>))}</ScrollView>
            {[{ k: 'title', l: 'Title *', p: 'e.g., Power of Attorney' },{ k: 'description', l: 'Description', p: 'Details', ml: true },{ k: 'due_date', l: 'Due Date', p: 'YYYY-MM-DD' },{ k: 'contact_person', l: 'Contact Person', p: 'Lawyer, accountant...' },{ k: 'notes', l: 'Notes', p: 'Any notes' }].map(({ k, l, p, ml }) => (
              <View key={k} style={s.fg}><Text style={s.fl}>{l}</Text><TextInput testID={`lf-${k}`} style={ml ? s.ta : s.fi} placeholder={p} placeholderTextColor={COLORS.border} value={(form as any)[k]} onChangeText={v => setForm({ ...form, [k]: v })} multiline={!!ml} textAlignVertical={ml ? 'top' : undefined} /></View>))}
          </ScrollView></SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md }, title: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.textPrimary },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl }, emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  card: { marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full }, typeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full }, statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  cardTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary, marginTop: 4 }, cardDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 }, sub: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  modal: { flex: 1, backgroundColor: COLORS.background }, mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border }, mTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary }, cancel: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary }, save: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '700' }, mBody: { padding: SPACING.lg },
  fg: { marginBottom: SPACING.md }, fl: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  fi: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: SPACING.md, height: 48, fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
  ta: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, padding: SPACING.md, fontSize: FONT_SIZES.md, color: COLORS.textPrimary, minHeight: 80 },
  chip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginRight: SPACING.sm }, chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary }, chipText: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.textSecondary }, chipTextActive: { color: COLORS.white },
});
