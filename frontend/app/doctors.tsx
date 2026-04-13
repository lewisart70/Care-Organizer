import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Modal, Alert, RefreshControl, Linking } from 'react-native';
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
  const [editingDoctor, setEditingDoctor] = useState<any>(null);
  const [form, setForm] = useState({ name: '', specialty: '', phone: '', address: '', email: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!selectedRecipientId) { setLoading(false); return; }
    try { setDoctors(await api.get(`/care-recipients/${selectedRecipientId}/doctors`)); }
    catch (e) {  } finally { setLoading(false); }
  }, [selectedRecipientId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAddModal = () => {
    setEditingDoctor(null);
    setForm({ name: '', specialty: '', phone: '', address: '', email: '', notes: '' });
    setShowAdd(true);
  };

  const openEditModal = (doctor: any) => {
    setEditingDoctor(doctor);
    setForm({
      name: doctor.name || '',
      specialty: doctor.specialty || '',
      phone: doctor.phone || '',
      address: doctor.address || '',
      email: doctor.email || '',
      notes: doctor.notes || '',
    });
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.specialty.trim()) { 
      Alert.alert('Required', 'Name and specialty are required'); 
      return; 
    }
    setSaving(true);
    try { 
      if (editingDoctor) {
        await api.put(`/care-recipients/${selectedRecipientId}/doctors/${editingDoctor.doctor_id}`, form);
        Alert.alert('Updated', 'Doctor information updated successfully');
      } else {
        await api.post(`/care-recipients/${selectedRecipientId}/doctors`, form); 
      }
      setShowAdd(false); 
      setEditingDoctor(null);
      setForm({ name: '', specialty: '', phone: '', address: '', email: '', notes: '' }); 
      await load(); 
    }
    catch (e: any) { Alert.alert('Error', e.message); } 
    finally { setSaving(false); }
  };

  const handleDelete = (doctorId: string, doctorName: string) => {
    Alert.alert(
      'Delete Doctor',
      `Are you sure you want to remove ${doctorName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.del(`/care-recipients/${selectedRecipientId}/doctors/${doctorId}`);
              await load();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          }
        }
      ]
    );
  };

  const callDoctor = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity testID="back-doctors" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Doctors & Specialists</Text>
        <TouchableOpacity testID="add-doctor-btn" onPress={openAddModal}>
          <Ionicons name="add-circle" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      
      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={COLORS.primary} />}>
        {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} /> :
          doctors.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="medical-outline" size={48} color={COLORS.primaryLight} />
              <Text style={s.emptyTitle}>No doctors added</Text>
              <Text style={s.emptyText}>Add doctors and specialists for quick reference</Text>
            </View>
          ) : doctors.map(d => (
            <TouchableOpacity 
              key={d.doctor_id} 
              style={s.card} 
              onPress={() => openEditModal(d)}
              activeOpacity={0.7}
            >
              <View style={s.row}>
                <View style={s.avatar}>
                  <Ionicons name="medical" size={20} color={COLORS.primary} />
                </View>
                <View style={s.info}>
                  <Text style={s.name}>{d.name}</Text>
                  <Text style={s.sub}>{d.specialty}</Text>
                </View>
                <View style={s.actions}>
                  <TouchableOpacity 
                    testID={`edit-doc-${d.doctor_id}`} 
                    style={s.actionBtn}
                    onPress={() => openEditModal(d)}
                  >
                    <Ionicons name="pencil" size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    testID={`del-doc-${d.doctor_id}`} 
                    style={s.actionBtn}
                    onPress={() => handleDelete(d.doctor_id, d.name)}
                  >
                    <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
              
              {d.phone && (
                <TouchableOpacity style={s.detail} onPress={() => callDoctor(d.phone)}>
                  <Ionicons name="call" size={14} color={COLORS.primary} />
                  <Text style={[s.detailText, { color: COLORS.primary }]}>{d.phone}</Text>
                </TouchableOpacity>
              )}
              {d.address && (
                <View style={s.detail}>
                  <Ionicons name="location" size={14} color={COLORS.textSecondary} />
                  <Text style={s.detailText}>{d.address}</Text>
                </View>
              )}
              {d.email && (
                <View style={s.detail}>
                  <Ionicons name="mail" size={14} color={COLORS.textSecondary} />
                  <Text style={s.detailText}>{d.email}</Text>
                </View>
              )}
              {d.notes && (
                <View style={s.notesContainer}>
                  <Text style={s.notesText}>{d.notes}</Text>
                </View>
              )}
              <View style={s.editHint}>
                <Text style={s.editHintText}>Tap to edit</Text>
              </View>
            </TouchableOpacity>
          ))}
      </ScrollView>
      
      {/* Add/Edit Doctor Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.mHeader}>
            <TouchableOpacity onPress={() => { setShowAdd(false); setEditingDoctor(null); }}>
              <Text style={s.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.mTitle}>{editingDoctor ? 'Edit Doctor' : 'Add Doctor'}</Text>
            <TouchableOpacity testID="save-doctor-btn" onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={s.save}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={s.mBody} keyboardShouldPersistTaps="handled">
            {[
              { k: 'name', l: 'Doctor Name *', p: 'Dr. Smith', icon: 'person' },
              { k: 'specialty', l: 'Specialty *', p: 'e.g., Cardiologist, Family Doctor', icon: 'medical' },
              { k: 'phone', l: 'Phone', p: 'Phone number', icon: 'call', kb: 'phone-pad' },
              { k: 'address', l: 'Clinic Address', p: 'Full address', icon: 'location' },
              { k: 'email', l: 'Email', p: 'Email address', icon: 'mail', kb: 'email-address' },
            ].map(({ k, l, p, icon, kb }) => (
              <View key={k} style={s.fg}>
                <View style={s.labelRow}>
                  <Ionicons name={icon as any} size={16} color={COLORS.textSecondary} />
                  <Text style={s.fl}>{l}</Text>
                </View>
                <TextInput 
                  testID={`doc-${k}`} 
                  style={s.fi} 
                  placeholder={p} 
                  placeholderTextColor={COLORS.border} 
                  value={(form as any)[k]} 
                  onChangeText={v => setForm({ ...form, [k]: v })}
                  keyboardType={(kb as any) || 'default'}
                  autoCapitalize={k === 'email' ? 'none' : 'words'}
                />
              </View>
            ))}
            
            {/* Notes field */}
            <View style={s.fg}>
              <View style={s.labelRow}>
                <Ionicons name="document-text" size={16} color={COLORS.textSecondary} />
                <Text style={s.fl}>Notes</Text>
              </View>
              <TextInput 
                testID="doc-notes"
                style={[s.fi, s.textArea]} 
                placeholder="Any notes about this doctor (e.g., office hours, specializations)"
                placeholderTextColor={COLORS.border} 
                value={form.notes} 
                onChangeText={v => setForm({ ...form, notes: v })}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
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
  emptyText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  
  card: { 
    marginHorizontal: SPACING.lg, 
    marginBottom: SPACING.sm, 
    padding: SPACING.md, 
    backgroundColor: COLORS.surface, 
    borderRadius: RADIUS.lg, 
    shadowColor: COLORS.cardShadow, 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 1, 
    shadowRadius: 4, 
    elevation: 2 
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: COLORS.primaryLight + '20', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: SPACING.sm 
  },
  info: { flex: 1 }, 
  name: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  sub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  
  actions: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: { padding: SPACING.xs, borderRadius: RADIUS.md },
  
  detail: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xs, marginLeft: 52 },
  detailText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginLeft: SPACING.xs, flex: 1 },
  
  notesContainer: { 
    marginTop: SPACING.sm, 
    marginLeft: 52, 
    padding: SPACING.sm, 
    backgroundColor: COLORS.background, 
    borderRadius: RADIUS.md 
  },
  notesText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontStyle: 'italic' },
  
  editHint: { alignItems: 'flex-end', marginTop: SPACING.xs },
  editHintText: { fontSize: FONT_SIZES.xs, color: COLORS.border, fontStyle: 'italic' },
  
  modal: { flex: 1, backgroundColor: COLORS.background },
  mHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: SPACING.lg, 
    paddingVertical: SPACING.md, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border 
  },
  mTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  cancel: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  save: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '700' },
  mBody: { padding: SPACING.lg },
  
  fg: { marginBottom: SPACING.md }, 
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.xs },
  fl: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary },
  fi: { 
    backgroundColor: COLORS.surface, 
    borderRadius: RADIUS.lg, 
    borderWidth: 1.5, 
    borderColor: COLORS.border, 
    paddingHorizontal: SPACING.md, 
    height: 48, 
    fontSize: FONT_SIZES.md, 
    color: COLORS.textPrimary 
  },
  textArea: { 
    height: 100, 
    paddingTop: SPACING.md, 
    textAlignVertical: 'top' 
  },
});
