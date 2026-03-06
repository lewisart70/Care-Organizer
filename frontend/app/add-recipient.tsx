import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';

export default function AddRecipientScreen() {
  const { setSelectedRecipientId } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', date_of_birth: '', gender: '', address: '', phone: '',
    blood_type: '', health_card_number: '', insurance_info: '', notes: '',
  });
  const [conditions, setConditions] = useState('');
  const [allergies, setAllergies] = useState('');
  const [interests, setInterests] = useState('');

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Required', 'Name is required'); return; }
    setSaving(true);
    try {
      const body = {
        ...form,
        medical_conditions: conditions ? conditions.split(',').map(s => s.trim()).filter(Boolean) : [],
        allergies: allergies ? allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        interests: interests ? interests.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      const result = await api.post('/care-recipients', body);
      setSelectedRecipientId(result.recipient_id);
      router.back();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const fields = [
    { key: 'name', label: 'Full Name *', placeholder: 'Care recipient\'s name', icon: 'person' },
    { key: 'date_of_birth', label: 'Date of Birth', placeholder: 'e.g., 1945-03-15', icon: 'calendar' },
    { key: 'gender', label: 'Gender', placeholder: 'e.g., Female', icon: 'person' },
    { key: 'phone', label: 'Phone', placeholder: 'Phone number', icon: 'call' },
    { key: 'address', label: 'Address', placeholder: 'Home address', icon: 'location' },
    { key: 'blood_type', label: 'Blood Type', placeholder: 'e.g., O+', icon: 'water' },
    { key: 'health_card_number', label: 'Health Card Number', placeholder: 'Health card #', icon: 'card' },
    { key: 'insurance_info', label: 'Insurance Info', placeholder: 'Insurance details', icon: 'shield-checkmark' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity testID="close-add-recipient" onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Care Recipient</Text>
          <TouchableOpacity testID="save-recipient-btn" onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={styles.saveText}>Save</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          {fields.map(({ key, label, placeholder, icon }) => (
            <View key={key} style={styles.formGroup}>
              <Text style={styles.formLabel}>{label}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name={icon as any} size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput testID={`recipient-${key}`} style={styles.input} placeholder={placeholder}
                  placeholderTextColor={COLORS.border} value={(form as any)[key]}
                  onChangeText={(v) => setForm({ ...form, [key]: v })} />
              </View>
            </View>
          ))}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Medical Conditions</Text>
            <TextInput testID="recipient-conditions" style={styles.textArea} placeholder="Comma-separated (e.g., Diabetes, Hypertension)"
              placeholderTextColor={COLORS.border} value={conditions} onChangeText={setConditions} multiline />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Allergies</Text>
            <TextInput testID="recipient-allergies" style={styles.textArea} placeholder="Comma-separated (e.g., Penicillin, Nuts)"
              placeholderTextColor={COLORS.border} value={allergies} onChangeText={setAllergies} multiline />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Interests & Hobbies</Text>
            <TextInput testID="recipient-interests" style={styles.textArea} placeholder="Comma-separated (e.g., Reading, Gardening)"
              placeholderTextColor={COLORS.border} value={interests} onChangeText={setInterests} multiline />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Additional Notes</Text>
            <TextInput testID="recipient-notes" style={styles.textArea} placeholder="Any additional notes..."
              placeholderTextColor={COLORS.border} value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} multiline />
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  saveText: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '700' },
  body: { padding: SPACING.lg },
  formGroup: { marginBottom: SPACING.md },
  formLabel: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: SPACING.md, height: 48 },
  inputIcon: { marginRight: SPACING.sm },
  input: { flex: 1, fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
  textArea: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, padding: SPACING.md, fontSize: FONT_SIZES.md, color: COLORS.textPrimary, minHeight: 60 },
});
