import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Modal, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';

export default function DailyRoutineScreen() {
  const { selectedRecipientId } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ time_of_day: 'morning', activity: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    if (!selectedRecipientId) { setLoading(false); return; }
    try { setItems(await api.get(`/care-recipients/${selectedRecipientId}/routines`)); } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [selectedRecipientId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const handleAdd = async () => {
    if (!form.activity.trim()) { Alert.alert('Required', 'Activity required'); return; }
    setSaving(true);
    try { await api.post(`/care-recipients/${selectedRecipientId}/routines`, form); setShowAdd(false); setForm({ time_of_day: 'morning', activity: '', notes: '' }); await load(); }
    catch (e: any) { Alert.alert('Error', e.message); } finally { setSaving(false); }
  };
  const timeIcon = (t: string) => t === 'morning' ? 'sunny' : t === 'afternoon' ? 'partly-sunny' : t === 'evening' ? 'moon' : 'bed';
  const timeColor = (t: string) => t === 'morning' ? '#E67E22' : t === 'afternoon' ? COLORS.primary : t === 'evening' ? COLORS.info : '#9B59B6';
  const grouped = ['morning', 'afternoon', 'evening', 'night'].map(t => ({ time: t, routines: items.filter(i => i.time_of_day === t) })).filter(g => g.routines.length > 0);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}><TouchableOpacity testID="back-routine" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity><Text style={s.title}>Daily Routine</Text><TouchableOpacity testID="add-routine-btn" onPress={() => setShowAdd(true)}><Ionicons name="add-circle" size={28} color={COLORS.primary} /></TouchableOpacity></View>
      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={COLORS.primary} />}>
        {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} /> :
          items.length === 0 ? (<View style={s.empty}><Ionicons name="time-outline" size={48} color={COLORS.primaryLight} /><Text style={s.emptyTitle}>No routines set</Text></View>) :
          grouped.map(g => (
            <View key={g.time}>
              <View style={s.timeHeader}><Ionicons name={timeIcon(g.time) as any} size={20} color={timeColor(g.time)} /><Text style={[s.timeLabel, { color: timeColor(g.time) }]}>{g.time.charAt(0).toUpperCase() + g.time.slice(1)}</Text></View>
              {g.routines.map(r => (<View key={r.routine_id} style={[s.card, { borderLeftColor: timeColor(g.time) }]}>
                <View style={s.row}><Text style={s.activity}>{r.activity}</Text>
                  <TouchableOpacity testID={`del-routine-${r.routine_id}`} onPress={async () => { await api.del(`/care-recipients/${selectedRecipientId}/routines/${r.routine_id}`); load(); }}><Ionicons name="close-circle" size={20} color={COLORS.error} /></TouchableOpacity></View>
                {r.notes && <Text style={s.notes}>{r.notes}</Text>}
              </View>))}
            </View>
          ))}
      </ScrollView>
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}><View style={s.mHeader}><TouchableOpacity onPress={() => setShowAdd(false)}><Text style={s.cancel}>Cancel</Text></TouchableOpacity><Text style={s.mTitle}>Add Routine</Text><TouchableOpacity testID="save-routine-btn" onPress={handleAdd} disabled={saving}>{saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={s.save}>Save</Text>}</TouchableOpacity></View>
          <ScrollView style={s.mBody}>
            <Text style={s.fl}>Time of Day</Text><ScrollView horizontal style={{ marginBottom: SPACING.md }}>{['morning', 'afternoon', 'evening', 'night'].map(t => (<TouchableOpacity key={t} testID={`time-${t}`} style={[s.chip, form.time_of_day === t && { backgroundColor: timeColor(t), borderColor: timeColor(t) }]} onPress={() => setForm({ ...form, time_of_day: t })}><Text style={[s.chipText, form.time_of_day === t && { color: COLORS.white }]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text></TouchableOpacity>))}</ScrollView>
            <View style={s.fg}><Text style={s.fl}>Activity *</Text><TextInput testID="routine-activity" style={s.fi} placeholder="e.g., Take morning medications" placeholderTextColor={COLORS.border} value={form.activity} onChangeText={v => setForm({ ...form, activity: v })} /></View>
            <View style={s.fg}><Text style={s.fl}>Notes</Text><TextInput testID="routine-notes" style={s.ta} placeholder="Any details" placeholderTextColor={COLORS.border} value={form.notes} onChangeText={v => setForm({ ...form, notes: v })} multiline textAlignVertical="top" /></View>
          </ScrollView></SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md }, title: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.textPrimary },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl }, emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  timeHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, marginTop: SPACING.sm }, timeLabel: { fontSize: FONT_SIZES.md, fontWeight: '700', marginLeft: SPACING.sm },
  card: { marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderLeftWidth: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, activity: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.textPrimary, flex: 1 }, notes: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  modal: { flex: 1, backgroundColor: COLORS.background }, mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border }, mTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary }, cancel: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary }, save: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '700' }, mBody: { padding: SPACING.lg },
  fg: { marginBottom: SPACING.md }, fl: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  fi: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: SPACING.md, height: 48, fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
  ta: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, padding: SPACING.md, fontSize: FONT_SIZES.md, color: COLORS.textPrimary, minHeight: 80 },
  chip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginRight: SPACING.sm }, chipText: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.textSecondary },
});
