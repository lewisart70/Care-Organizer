import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Modal, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';

export default function DoctorsScreen() {
  const { selectedRecipientId } = useAuth();
  const router = useRouter();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', specialty: '', phone: '', address: '', email: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!selectedRecipientId) { setLoading(false); return; }
    try { setDoctors(await api.get(`/care-recipients/${selectedRecipientId}/doctors`)); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }, [selectedRecipientId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAdd = async () => {
    if (!form.name.trim() || !form.specialty.trim()) { Alert.alert('Required', 'Name and specialty are required'); return; }
    setSaving(true);
    try { await api.post(`/care-recipients/${selectedRecipientId}/doctors`, form); setShowAdd(false); setForm({ name: '', specialty: '', phone: '', address: '', email: '', notes: '' }); await load(); }
    catch (e: any) { Alert.alert('Error', e.message); } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity testID="back-doctors" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
        <Text style={s.headerTitle}>Doctors & Specialists</Text>
        <TouchableOpacity testID="add-doctor-btn" onPress={() => setShowAdd(true)}><Ionicons name="add-circle" size={28} color={COLORS.primary} /></TouchableOpacity>
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={COLORS.primary} />}>
        {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} /> :
          doctors.length === 0 ? (
            <View style={s.empty}><Ionicons name="medical-outline" size={48} color={COLORS.primaryLight} /><Text style={s.emptyTitle}>No doctors added</Text></View>
          ) : doctors.map(d => (
            <View key={d.doctor_id} style={s.card}>
              <View style={s.row}><View style={s.avatar}><Ionicons name="medical" size={20} color={COLORS.primary} /></View>
                <View style={s.info}><Text style={s.name}>{d.name}</Text><Text style={s.sub}>{d.specialty}</Text></View>
                <TouchableOpacity testID={`del-doc-${d.doctor_id}`} onPress={async () => { await api.del(`/care-recipients/${selectedRecipientId}/doctors/${d.doctor_id}`); load(); }}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.error} /></TouchableOpacity>
              </View>
              {d.phone && <View style={s.detail}><Ionicons name="call" size={14} color={COLORS.textSecondary} /><Text style={s.detailText}>{d.phone}</Text></View>}
              {d.address && <View style={s.detail}><Ionicons name="location" size={14} color={COLORS.textSecondary} /><Text style={s.detailText}>{d.address}</Text></View>}
            </View>
          ))}
      </ScrollView>
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.mHeader}>
            <TouchableOpacity onPress={() => setShowAdd(false)}><Text style={s.cancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.mTitle}>Add Doctor</Text>
            <TouchableOpacity testID="save-doctor-btn" onPress={handleAdd} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={s.save}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={s.mBody}>
            {[{ k: 'name', l: 'Doctor Name *', p: 'Dr. Smith' },{ k: 'specialty', l: 'Specialty *', p: 'Cardiologist' },{ k: 'phone', l: 'Phone', p: 'Phone number' },{ k: 'address', l: 'Address', p: 'Clinic address' },{ k: 'email', l: 'Email', p: 'Email' }].map(({ k, l, p }) => (
              <View key={k} style={s.fg}><Text style={s.fl}>{l}</Text>
                <TextInput testID={`doc-${k}`} style={s.fi} placeholder={p} placeholderTextColor={COLORS.border} value={(form as any)[k]} onChangeText={v => setForm({ ...form, [k]: v })} /></View>))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  headerTitle: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.textPrimary },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  card: { marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryLight + '20', justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
  info: { flex: 1 }, name: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  sub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  detail: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginLeft: 52 },
  detailText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginLeft: 4 },
  modal: { flex: 1, backgroundColor: COLORS.background },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  mTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  cancel: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  save: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '700' },
  mBody: { padding: SPACING.lg },
  fg: { marginBottom: SPACING.md }, fl: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  fi: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: SPACING.md, height: 48, fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
});
