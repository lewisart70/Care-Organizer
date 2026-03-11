import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Modal, Alert, RefreshControl, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../src/constants/theme';

// Medication time colors (Medisafe-inspired)
const TIME_COLORS: Record<string, string> = {
  morning: '#F59E0B',
  afternoon: '#3B82F6',
  evening: '#8B5CF6',
  night: '#6366F1',
  'with meals': '#10B981',
  'as needed': '#EC4899',
};

export default function MedicationsTab() {
  const { selectedRecipientId } = useAuth();
  const router = useRouter();
  const [meds, setMeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', dosage: '', frequency: '', time_of_day: [] as string[], instructions: '', prescribing_doctor: '' });
  const [saving, setSaving] = useState(false);
  
  // Pharmacy state
  const [pharmacyInfo, setPharmacyInfo] = useState<any>({ name: '', address: '', phone: '', fax: '', website: '' });
  const [showPharmacyModal, setShowPharmacyModal] = useState(false);
  const [savingPharmacy, setSavingPharmacy] = useState(false);

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
      // time_of_day is already an array
      const payload = {
        ...form,
        time_of_day: form.time_of_day,
        notes: form.instructions || null,
      };
      await api.post(`/care-recipients/${selectedRecipientId}/medications`, payload);
      setShowAdd(false);
      setForm({ name: '', dosage: '', frequency: '', time_of_day: [], instructions: '', prescribing_doctor: '' });
      await loadMeds();
      Alert.alert('Success', 'Medication added!', [
        { text: 'Add Another', onPress: () => setShowAdd(true) },
        { text: 'Done', style: 'default' }
      ]);
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to save medication'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (medId: string) => {
    Alert.alert('Delete Medication', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.del(`/care-recipients/${selectedRecipientId}/medications/${medId}`);
          await loadMeds();
        } catch (e: any) { Alert.alert('Error', e.message); }
      }}
    ]);
  };

  const handleSavePharmacy = async () => {
    setSavingPharmacy(true);
    try {
      await api.patch(`/care-recipients/${selectedRecipientId}`, { pharmacy_info: pharmacyInfo });
      setShowPharmacyModal(false);
      Alert.alert('Saved', 'Pharmacy information updated');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSavingPharmacy(false); }
  };

  const getTimeColor = (timeOfDay: string | string[] | undefined) => {
    // Handle array or string format
    const timeStr = Array.isArray(timeOfDay) ? timeOfDay[0] : timeOfDay;
    const key = timeStr?.toLowerCase() || '';
    return TIME_COLORS[key] || COLORS.primary;
  };

  if (!selectedRecipientId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="medical-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No Care Recipient Selected</Text>
          <Text style={styles.emptyText}>Select someone from the Home tab</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Medications</Text>
          <Text style={styles.headerSubtitle}>{meds.length} active medications</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        refreshControl={<RefreshControl refreshing={false} onRefresh={loadMeds} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.xxl }} />
        ) : (
          <>
            {/* AI Drug Interaction Checker */}
            <TouchableOpacity 
              style={styles.interactionCard} 
              onPress={() => router.push('/medication-checker')}
            >
              <View style={styles.interactionIcon}>
                <Ionicons name="sparkles" size={22} color={COLORS.white} />
              </View>
              <View style={styles.interactionContent}>
                <Text style={styles.interactionTitle}>Check Drug Interactions</Text>
                <Text style={styles.interactionSubtitle}>AI-powered safety analysis</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
            </TouchableOpacity>

            {/* Pharmacy Card */}
            <TouchableOpacity style={styles.pharmacyCard} onPress={() => setShowPharmacyModal(true)}>
              <View style={styles.pharmacyHeader}>
                <View style={styles.pharmacyIcon}>
                  <Ionicons name="storefront" size={22} color={COLORS.secondary} />
                </View>
                <View style={styles.pharmacyInfo}>
                  <Text style={styles.pharmacyLabel}>Pharmacy</Text>
                  <Text style={styles.pharmacyName}>
                    {pharmacyInfo.name || 'Tap to add pharmacy info'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
              </View>
              {pharmacyInfo.phone && (
                <TouchableOpacity 
                  style={styles.pharmacyAction}
                  onPress={() => Linking.openURL(`tel:${pharmacyInfo.phone}`)}
                >
                  <Ionicons name="call" size={16} color={COLORS.success} />
                  <Text style={styles.pharmacyActionText}>{pharmacyInfo.phone}</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {/* Medications List */}
            {meds.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="medical" size={40} color={COLORS.primary} />
                </View>
                <Text style={styles.emptyTitle}>No medications added</Text>
                <Text style={styles.emptyText}>Tap the + button to add medications</Text>
              </View>
            ) : (
              meds.map(med => (
                <View key={med.medication_id} style={styles.medCard}>
                  <View style={styles.medHeader}>
                    <View style={[styles.medTimeIndicator, { backgroundColor: getTimeColor(med.time_of_day) }]} />
                    <View style={styles.medInfo}>
                      <Text style={styles.medName}>{med.name}</Text>
                      <Text style={styles.medDosage}>{med.dosage}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleDelete(med.medication_id)}
                    >
                      <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.medDetails}>
                    <View style={styles.medDetailRow}>
                      <Ionicons name="repeat" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.medDetailText}>{med.frequency}</Text>
                    </View>
                    {med.time_of_day && (
                      <View style={styles.medDetailRow}>
                        <Ionicons name="time" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.medDetailText}>{med.time_of_day}</Text>
                      </View>
                    )}
                  </View>
                  
                  {med.instructions && (
                    <View style={styles.medInstructions}>
                      <Text style={styles.medInstructionsText}>{med.instructions}</Text>
                    </View>
                  )}
                  
                  {med.prescribing_doctor && (
                    <View style={styles.medDoctor}>
                      <Ionicons name="person" size={14} color={COLORS.textMuted} />
                      <Text style={styles.medDoctorText}>Dr. {med.prescribing_doctor}</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </>
        )}
        
        <View style={{ height: SPACING.xxxl }} />
      </ScrollView>

      {/* Add Medication Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAdd(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Medication</Text>
            <TouchableOpacity onPress={handleAdd} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : 
                <Text style={styles.modalSave}>Save</Text>}
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {[
              { key: 'name', label: 'Medication Name *', placeholder: 'e.g., Aspirin' },
              { key: 'dosage', label: 'Dosage *', placeholder: 'e.g., 100mg' },
              { key: 'frequency', label: 'Frequency *', placeholder: 'e.g., Once daily' },
              { key: 'time_of_day', label: 'Time of Day', placeholder: 'e.g., Morning' },
              { key: 'instructions', label: 'Special Instructions', placeholder: 'e.g., Take with food', multiline: true },
              { key: 'prescribing_doctor', label: 'Prescribing Doctor', placeholder: 'Doctor name' },
            ].map(field => (
              <View key={field.key} style={styles.formGroup}>
                <Text style={styles.formLabel}>{field.label}</Text>
                <TextInput
                  style={[styles.formInput, field.multiline && styles.formTextarea]}
                  placeholder={field.placeholder}
                  placeholderTextColor={COLORS.textMuted}
                  value={(form as any)[field.key]}
                  onChangeText={v => setForm({ ...form, [field.key]: v })}
                  multiline={field.multiline}
                />
              </View>
            ))}
            
            {/* Time of Day Quick Select */}
            <Text style={styles.formLabel}>Quick Select Time</Text>
            <View style={styles.timeChips}>
              {Object.entries(TIME_COLORS).map(([time, color]) => {
                const isSelected = form.time_of_day.map(t => t.toLowerCase()).includes(time);
                return (
                <TouchableOpacity
                  key={time}
                  style={[styles.timeChip, isSelected && { backgroundColor: color }]}
                  onPress={() => {
                    const formattedTime = time.charAt(0).toUpperCase() + time.slice(1);
                    if (isSelected) {
                      // Remove if already selected
                      setForm({ ...form, time_of_day: form.time_of_day.filter(t => t.toLowerCase() !== time) });
                    } else {
                      // Add if not selected
                      setForm({ ...form, time_of_day: [...form.time_of_day, formattedTime] });
                    }
                  }}
                >
                  <Text style={[styles.timeChipText, isSelected && { color: COLORS.white }]}>
                    {time.charAt(0).toUpperCase() + time.slice(1)}
                  </Text>
                </TouchableOpacity>
              )})}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Pharmacy Modal */}
      <Modal visible={showPharmacyModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPharmacyModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Pharmacy Info</Text>
            <TouchableOpacity onPress={handleSavePharmacy} disabled={savingPharmacy}>
              {savingPharmacy ? <ActivityIndicator size="small" color={COLORS.primary} /> : 
                <Text style={styles.modalSave}>Save</Text>}
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {[
              { key: 'name', label: 'Pharmacy Name', placeholder: 'e.g., Shoppers Drug Mart' },
              { key: 'address', label: 'Address', placeholder: 'Street address' },
              { key: 'phone', label: 'Phone', placeholder: 'Phone number' },
              { key: 'fax', label: 'Fax', placeholder: 'Fax number' },
              { key: 'website', label: 'Website', placeholder: 'https://' },
            ].map(field => (
              <View key={field.key} style={styles.formGroup}>
                <Text style={styles.formLabel}>{field.label}</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder={field.placeholder}
                  placeholderTextColor={COLORS.textMuted}
                  value={(pharmacyInfo as any)[field.key] || ''}
                  onChangeText={v => setPharmacyInfo({ ...pharmacyInfo, [field.key]: v })}
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow for button
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  // Pharmacy Card
  pharmacyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pharmacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pharmacyIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.secondaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pharmacyInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  pharmacyLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pharmacyName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  pharmacyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  pharmacyActionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },

  // AI Drug Interaction Card
  interactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary + '30',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  interactionIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  interactionContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  interactionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  interactionSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    marginTop: 2,
  },

  // Medication Card
  medCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  medHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medTimeIndicator: {
    width: 4,
    height: 44,
    borderRadius: 2,
    marginRight: SPACING.md,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  medDosage: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  medDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  medDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  medDetailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  medInstructions: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.warningLight,
    borderRadius: RADIUS.md,
  },
  medInstructionsText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.warning,
    fontStyle: 'italic',
  },
  medDoctor: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  medDoctorText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginLeft: SPACING.xs,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalCancel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  modalSave: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '700',
  },
  modalBody: {
    flex: 1,
    padding: SPACING.lg,
  },

  // Form
  formGroup: {
    marginBottom: SPACING.lg,
  },
  formLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  formInput: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  formTextarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },

  // Time Chips
  timeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  timeChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  timeChipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
