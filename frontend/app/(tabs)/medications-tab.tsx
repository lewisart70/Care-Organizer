import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Modal, Alert, RefreshControl, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../src/constants/theme';

export default function MedicationsTab() {
  const { selectedRecipientId } = useAuth();
  const router = useRouter();
  const [meds, setMeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', dosage: '', frequency: '', time_of_day: '', instructions: '', prescribing_doctor: '' });
  const [saving, setSaving] = useState(false);
  
  // Pharmacy state
  const [pharmacyInfo, setPharmacyInfo] = useState<any>({ name: '', address: '', phone: '', fax: '', website: '' });
  const [showPharmacyModal, setShowPharmacyModal] = useState(false);
  const [savingPharmacy, setSavingPharmacy] = useState(false);
  const [pharmacyExpanded, setPharmacyExpanded] = useState(false);

  const loadMeds = useCallback(async () => {
    if (!selectedRecipientId) { setLoading(false); return; }
    try {
      const [medsData, recipientData] = await Promise.all([
        api.get(`/care-recipients/${selectedRecipientId}/medications`),
        api.get(`/care-recipients/${selectedRecipientId}`)
      ]);
      setMeds(medsData);
      if (recipientData.pharmacy_info) {
        setPharmacyInfo(recipientData.pharmacy_info);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [selectedRecipientId]);

  useFocusEffect(useCallback(() => { loadMeds(); }, [loadMeds]));

  const handleAdd = async () => {
    if (!form.name.trim() || !form.dosage.trim() || !form.frequency.trim()) {
      Alert.alert('Required', 'Name, dosage, and frequency are required');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/care-recipients/${selectedRecipientId}/medications`, form);
      setShowAdd(false);
      setForm({ name: '', dosage: '', frequency: '', time_of_day: '', instructions: '', prescribing_doctor: '' });
      await loadMeds();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (medId: string) => {
    try {
      await api.del(`/care-recipients/${selectedRecipientId}/medications/${medId}`);
      await loadMeds();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const savePharmacy = async () => {
    setSavingPharmacy(true);
    try {
      await api.patch(`/care-recipients/${selectedRecipientId}`, { pharmacy_info: pharmacyInfo });
      setShowPharmacyModal(false);
      Alert.alert('Saved', 'Pharmacy information updated');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSavingPharmacy(false); }
  };

  const callPharmacy = () => {
    if (pharmacyInfo.phone) {
      Linking.openURL(`tel:${pharmacyInfo.phone}`);
    }
  };

  const openWebsite = () => {
    if (pharmacyInfo.website) {
      let url = pharmacyInfo.website;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      Linking.openURL(url);
    }
  };

  const hasPharmacyInfo = pharmacyInfo.name || pharmacyInfo.phone;

  if (!selectedRecipientId) {
    return <SafeAreaView style={styles.container}><View style={styles.centered}><Text style={styles.emptyText}>Select a care recipient first</Text></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Medications</Text>
        <TouchableOpacity testID="add-medication-btn" style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* AI Interaction Checker - moved below header */}
      <TouchableOpacity testID="check-interactions-btn" style={styles.aiCheckerBar} onPress={() => router.push('/medication-checker')}>
        <View style={styles.aiCheckerLeft}>
          <Ionicons name="sparkles" size={18} color={COLORS.secondary} />
          <Text style={styles.aiCheckerText}>AI Medication Interaction Checker</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.secondary} />
      </TouchableOpacity>

      {/* Pharmacy Card */}
      <TouchableOpacity 
        style={styles.pharmacyCard} 
        onPress={() => setPharmacyExpanded(!pharmacyExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.pharmacyHeader}>
          <View style={styles.pharmacyIcon}>
            <Ionicons name="storefront" size={20} color={COLORS.info} />
          </View>
          <View style={styles.pharmacyHeaderText}>
            <Text style={styles.pharmacyTitle}>Pharmacy</Text>
            {hasPharmacyInfo ? (
              <Text style={styles.pharmacyName}>{pharmacyInfo.name || 'Tap to view'}</Text>
            ) : (
              <Text style={styles.pharmacyEmpty}>Add pharmacy information</Text>
            )}
          </View>
          <View style={styles.pharmacyActions}>
            <TouchableOpacity style={styles.pharmacyEditBtn} onPress={() => setShowPharmacyModal(true)}>
              <Ionicons name="pencil" size={16} color={COLORS.info} />
            </TouchableOpacity>
            <Ionicons name={pharmacyExpanded ? "chevron-up" : "chevron-down"} size={20} color={COLORS.textSecondary} />
          </View>
        </View>
        
        {pharmacyExpanded && hasPharmacyInfo && (
          <View style={styles.pharmacyDetails}>
            {pharmacyInfo.address && (
              <View style={styles.pharmacyDetailRow}>
                <Ionicons name="location" size={14} color={COLORS.textSecondary} />
                <Text style={styles.pharmacyDetailText}>{pharmacyInfo.address}</Text>
              </View>
            )}
            {pharmacyInfo.phone && (
              <TouchableOpacity style={styles.pharmacyDetailRow} onPress={callPharmacy}>
                <Ionicons name="call" size={14} color={COLORS.primary} />
                <Text style={[styles.pharmacyDetailText, { color: COLORS.primary }]}>{pharmacyInfo.phone}</Text>
              </TouchableOpacity>
            )}
            {pharmacyInfo.fax && (
              <View style={styles.pharmacyDetailRow}>
                <Ionicons name="print" size={14} color={COLORS.textSecondary} />
                <Text style={styles.pharmacyDetailText}>Fax: {pharmacyInfo.fax}</Text>
              </View>
            )}
            {pharmacyInfo.website && (
              <TouchableOpacity style={styles.pharmacyDetailRow} onPress={openWebsite}>
                <Ionicons name="globe" size={14} color={COLORS.info} />
                <Text style={[styles.pharmacyDetailText, { color: COLORS.info }]}>{pharmacyInfo.website}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>

      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={loadMeds} tintColor={COLORS.primary} />}>
        {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} /> :
          meds.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="medkit-outline" size={48} color={COLORS.primaryLight} />
              <Text style={styles.emptyTitle}>No medications yet</Text>
              <Text style={styles.emptyText}>Add medications to track dosages and schedules</Text>
            </View>
          ) : meds.map((med) => (
            <View key={med.medication_id} style={styles.medCard}>
              <View style={styles.medHeader}>
                <View style={styles.medIcon}><Ionicons name="medical" size={20} color={COLORS.primary} /></View>
                <View style={styles.medInfo}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <Text style={styles.medDosage}>{med.dosage} • {med.frequency}</Text>
                </View>
                <TouchableOpacity testID={`delete-med-${med.medication_id}`} onPress={() => handleDelete(med.medication_id)}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
              {med.time_of_day ? <View style={styles.medDetail}><Ionicons name="time-outline" size={14} color={COLORS.textSecondary} /><Text style={styles.medDetailText}>{med.time_of_day}</Text></View> : null}
              {med.instructions ? <View style={styles.medDetail}><Ionicons name="information-circle-outline" size={14} color={COLORS.textSecondary} /><Text style={styles.medDetailText}>{med.instructions}</Text></View> : null}
              {med.prescribing_doctor ? <View style={styles.medDetail}><Ionicons name="person-outline" size={14} color={COLORS.textSecondary} /><Text style={styles.medDetailText}>Dr. {med.prescribing_doctor}</Text></View> : null}
            </View>
          ))}
      </ScrollView>

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity testID="close-add-med-modal" onPress={() => setShowAdd(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Add Medication</Text>
            <TouchableOpacity testID="save-medication-btn" onPress={handleAdd} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            {[
              { key: 'name', label: 'Medication Name *', placeholder: 'e.g., Metformin' },
              { key: 'dosage', label: 'Dosage *', placeholder: 'e.g., 500mg' },
              { key: 'frequency', label: 'Frequency *', placeholder: 'e.g., Twice daily' },
              { key: 'time_of_day', label: 'Time of Day', placeholder: 'e.g., Morning and Evening' },
              { key: 'prescribing_doctor', label: 'Prescribing Doctor', placeholder: 'Doctor name' },
              { key: 'instructions', label: 'Special Instructions', placeholder: 'e.g., Take with food' },
            ].map(({ key, label, placeholder }) => (
              <View key={key} style={styles.formGroup}>
                <Text style={styles.formLabel}>{label}</Text>
                <TextInput
                  testID={`med-input-${key}`}
                  style={styles.formInput}
                  placeholder={placeholder}
                  placeholderTextColor={COLORS.border}
                  value={(form as any)[key]}
                  onChangeText={(v) => setForm({ ...form, [key]: v })}
                />
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      
      {/* Pharmacy Edit Modal */}
      <Modal visible={showPharmacyModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPharmacyModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Pharmacy Info</Text>
            <TouchableOpacity onPress={savePharmacy} disabled={savingPharmacy}>
              {savingPharmacy ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <View style={styles.pharmacyTip}>
              <Ionicons name="information-circle" size={18} color={COLORS.info} />
              <Text style={styles.pharmacyTipText}>
                Keep pharmacy details handy for refills and prescription transfers
              </Text>
            </View>
            {[
              { key: 'name', label: 'Pharmacy Name', placeholder: 'e.g., Shoppers Drug Mart', icon: 'storefront' },
              { key: 'address', label: 'Address', placeholder: 'Full pharmacy address', icon: 'location' },
              { key: 'phone', label: 'Phone Number', placeholder: 'e.g., 555-123-4567', icon: 'call', kb: 'phone-pad' },
              { key: 'fax', label: 'Fax Number', placeholder: 'e.g., 555-123-4568', icon: 'print', kb: 'phone-pad' },
              { key: 'website', label: 'Website', placeholder: 'e.g., www.pharmacy.com', icon: 'globe', kb: 'url' },
            ].map(({ key, label, placeholder, icon, kb }) => (
              <View key={key} style={styles.formGroup}>
                <View style={styles.formLabelRow}>
                  <Ionicons name={icon as any} size={16} color={COLORS.textSecondary} />
                  <Text style={styles.formLabel}>{label}</Text>
                </View>
                <TextInput
                  style={styles.formInput}
                  placeholder={placeholder}
                  placeholderTextColor={COLORS.border}
                  value={(pharmacyInfo as any)[key] || ''}
                  onChangeText={(v) => setPharmacyInfo({ ...pharmacyInfo, [key]: v })}
                  keyboardType={(kb as any) || 'default'}
                />
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  headerTitle: { fontSize: FONT_SIZES.xxl, fontWeight: '800', color: COLORS.textPrimary },
  addBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: COLORS.primary, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  aiCheckerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.secondary + '15',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.secondary + '30',
  },
  aiCheckerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiCheckerText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  
  // Pharmacy card styles
  pharmacyCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.info + '30',
  },
  pharmacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pharmacyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.info + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  pharmacyHeaderText: {
    flex: 1,
  },
  pharmacyTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pharmacyName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  pharmacyEmpty: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.border,
    fontStyle: 'italic',
  },
  pharmacyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  pharmacyEditBtn: {
    padding: SPACING.xs,
  },
  pharmacyDetails: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  pharmacyDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    gap: SPACING.xs,
  },
  pharmacyDetailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  pharmacyTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.info + '15',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    gap: 8,
  },
  pharmacyTipText: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
    color: COLORS.info,
    fontWeight: '600',
  },
  formLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.xs,
  },
  
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  emptyText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  medCard: { marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2 },
  medHeader: { flexDirection: 'row', alignItems: 'center' },
  medIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primaryLight + '20', justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
  medInfo: { flex: 1 },
  medName: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  medDosage: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  medDetail: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xs, marginLeft: 52 },
  medDetailText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginLeft: 4 },
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  cancelText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  saveText: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '700' },
  modalBody: { padding: SPACING.lg },
  formGroup: { marginBottom: SPACING.md },
  formLabel: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  formInput: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: SPACING.md, height: 48, fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
});
