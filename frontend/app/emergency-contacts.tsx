import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Modal, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';

export default function EmergencyContactsScreen() {
  const { selectedRecipientId } = useAuth();
  const router = useRouter();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', relationship: '', phone: '', email: '', notes: '', is_primary: false });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!selectedRecipientId) { setLoading(false); return; }
    try { setContacts(await api.get(`/care-recipients/${selectedRecipientId}/emergency-contacts`)); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }, [selectedRecipientId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAdd = async () => {
    if (!form.name.trim() || !form.phone.trim()) { Alert.alert('Required', 'Name and phone are required'); return; }
    setSaving(true);
    try {
      await api.post(`/care-recipients/${selectedRecipientId}/emergency-contacts`, form);
      setShowAdd(false); setForm({ name: '', relationship: '', phone: '', email: '', notes: '', is_primary: false });
      await load();
    } catch (e: any) { Alert.alert('Error', e.message); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await api.del(`/care-recipients/${selectedRecipientId}/emergency-contacts/${id}`); await load(); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
        <Text style={s.headerTitle}>Emergency Contacts</Text>
        <TouchableOpacity testID="add-contact-btn" onPress={() => setShowAdd(true)}><Ionicons name="add-circle" size={28} color={COLORS.primary} /></TouchableOpacity>
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={COLORS.primary} />}>
        {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} /> :
          contacts.length === 0 ? (
            <View style={s.empty}><Ionicons name="call-outline" size={48} color={COLORS.primaryLight} /><Text style={s.emptyTitle}>No emergency contacts</Text><Text style={s.emptyText}>Add important contacts for quick access</Text></View>
          ) : contacts.map(c => (
            <View key={c.contact_id} style={[s.card, c.is_primary && s.primaryCard]}>
              <View style={s.cardHeader}>
                <View style={[s.avatar, { backgroundColor: c.is_primary ? COLORS.error + '20' : COLORS.primary + '15' }]}>
                  <Ionicons name="person" size={20} color={c.is_primary ? COLORS.error : COLORS.primary} />
                </View>
                <View style={s.cardInfo}>
                  <View style={s.nameRow}>
                    <Text style={s.cardName}>{c.name}</Text>
                    {c.is_primary && <View style={s.primaryBadge}><Text style={s.primaryText}>Primary</Text></View>}
                  </View>
                  <Text style={s.cardSub}>{c.relationship}</Text>
                </View>
                <TouchableOpacity testID={`delete-contact-${c.contact_id}`} onPress={() => handleDelete(c.contact_id)}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
              <View style={s.contactDetails}>
                <View style={s.detailRow}><Ionicons name="call" size={16} color={COLORS.primary} /><Text style={s.detailText}>{c.phone}</Text></View>
                {c.email ? <View style={s.detailRow}><Ionicons name="mail" size={16} color={COLORS.primary} /><Text style={s.detailText}>{c.email}</Text></View> : null}
              </View>
            </View>
          ))}
      </ScrollView>
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowAdd(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Add Contact</Text>
            <TouchableOpacity testID="save-contact-btn" onPress={handleAdd} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={s.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={s.modalBody}>
            {[{ k: 'name', l: 'Name *', p: 'Contact name' }, { k: 'relationship', l: 'Relationship', p: 'e.g., Daughter' }, { k: 'phone', l: 'Phone *', p: 'Phone number' }, { k: 'email', l: 'Email', p: 'Email address' }, { k: 'notes', l: 'Notes', p: 'Any notes' }].map(({ k, l, p }) => (
              <View key={k} style={s.formGroup}>
                <Text style={s.formLabel}>{l}</Text>
                <TextInput testID={`contact-${k}`} style={s.formInput} placeholder={p} placeholderTextColor={COLORS.border} value={(form as any)[k]} onChangeText={v => setForm({ ...form, [k]: v })} />
              </View>
            ))}
            <TouchableOpacity testID="toggle-primary" style={s.toggleRow} onPress={() => setForm({ ...form, is_primary: !form.is_primary })}>
              <Ionicons name={form.is_primary ? 'checkbox' : 'square-outline'} size={24} color={COLORS.primary} />
              <Text style={s.toggleLabel}>Primary Emergency Contact</Text>
            </TouchableOpacity>
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
  emptyText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  card: { marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2 },
  primaryCard: { borderWidth: 1.5, borderColor: COLORS.error + '40' },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  cardName: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  primaryBadge: { backgroundColor: COLORS.error + '15', paddingHorizontal: SPACING.sm, paddingVertical: 1, borderRadius: RADIUS.full, marginLeft: SPACING.sm },
  primaryText: { fontSize: 10, fontWeight: '700', color: COLORS.error },
  cardSub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  contactDetails: { marginTop: SPACING.sm, marginLeft: 52 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  detailText: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, marginLeft: SPACING.sm },
  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  cancelText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  saveText: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '700' },
  modalBody: { padding: SPACING.lg },
  formGroup: { marginBottom: SPACING.md },
  formLabel: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  formInput: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: SPACING.md, height: 48, fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md },
  toggleLabel: { fontSize: FONT_SIZES.md, color: COLORS.textPrimary, marginLeft: SPACING.sm },
});
