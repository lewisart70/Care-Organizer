import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Modal, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';

export default function AppointmentsScreen() {
  const { selectedRecipientId } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', time: '', doctor_name: '', location: '', appointment_type: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!selectedRecipientId) { setLoading(false); return; }
    try { setItems(await api.get(`/care-recipients/${selectedRecipientId}/appointments`)); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }, [selectedRecipientId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAdd = async () => {
    if (!form.title.trim() || !form.date.trim()) { Alert.alert('Required', 'Title and date are required'); return; }
    setSaving(true);
    try { await api.post(`/care-recipients/${selectedRecipientId}/appointments`, form); setShowAdd(false); setForm({ title: '', date: '', time: '', doctor_name: '', location: '', appointment_type: '', notes: '' }); await load(); }
    catch (e: any) { Alert.alert('Error', e.message); } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity testID="back-appts" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
        <Text style={s.title}>Appointments</Text>
        <TouchableOpacity testID="add-appt-btn" onPress={() => setShowAdd(true)}><Ionicons name="add-circle" size={28} color={COLORS.primary} /></TouchableOpacity>
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={COLORS.primary} />}>
        {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} /> :
          items.length === 0 ? (
            <View style={s.empty}><Ionicons name="calendar-outline" size={48} color={COLORS.primaryLight} /><Text style={s.emptyTitle}>No appointments</Text></View>
          ) : items.map(a => (
            <View key={a.appointment_id} style={s.card}>
              <View style={s.row}>
                <View style={s.dateBox}><Ionicons name="calendar" size={20} color={COLORS.primary} /><Text style={s.dateText}>{a.date}</Text></View>
                <TouchableOpacity testID={`del-appt-${a.appointment_id}`} onPress={async () => { await api.del(`/care-recipients/${selectedRecipientId}/appointments/${a.appointment_id}`); load(); }}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.error} /></TouchableOpacity>
              </View>
              <Text style={s.cardTitle}>{a.title}</Text>
              {a.time && <Text style={s.cardSub}><Ionicons name="time-outline" size={14} /> {a.time}</Text>}
              {a.doctor_name && <Text style={s.cardSub}><Ionicons name="person-outline" size={14} /> Dr. {a.doctor_name}</Text>}
              {a.location && <Text style={s.cardSub}><Ionicons name="location-outline" size={14} /> {a.location}</Text>}
            </View>
          ))}
      </ScrollView>
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.mHeader}>
            <TouchableOpacity onPress={() => setShowAdd(false)}><Text style={s.cancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.mTitle}>Add Appointment</Text>
            <TouchableOpacity testID="save-appt-btn" onPress={handleAdd} disabled={saving}>{saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={s.save}>Save</Text>}</TouchableOpacity>
          </View>
          <ScrollView style={s.mBody}>
            {[{ k: 'title', l: 'Title *', p: 'e.g., Cardiology checkup' },{ k: 'date', l: 'Date *', p: 'YYYY-MM-DD' },{ k: 'time', l: 'Time', p: 'e.g., 10:00 AM' },{ k: 'doctor_name', l: 'Doctor', p: 'Doctor name' },{ k: 'location', l: 'Location', p: 'Clinic address' },{ k: 'appointment_type', l: 'Type', p: 'e.g., Follow-up' },{ k: 'notes', l: 'Notes', p: 'Any notes' }].map(({ k, l, p }) => (
              <View key={k} style={s.fg}><Text style={s.fl}>{l}</Text><TextInput testID={`appt-${k}`} style={s.fi} placeholder={p} placeholderTextColor={COLORS.border} value={(form as any)[k]} onChangeText={v => setForm({ ...form, [k]: v })} /></View>))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  title: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.textPrimary },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  card: { marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateBox: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: '600', marginLeft: 4 },
  cardTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary, marginTop: 4 },
  cardSub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  modal: { flex: 1, backgroundColor: COLORS.background },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  mTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  cancel: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  save: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '700' },
  mBody: { padding: SPACING.lg },
  fg: { marginBottom: SPACING.md }, fl: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  fi: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: SPACING.md, height: 48, fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
});
