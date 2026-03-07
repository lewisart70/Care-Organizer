import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';

export default function EditProfileScreen() {
  const { selectedRecipientId } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', date_of_birth: '', gender: '', address: '', phone: '', blood_type: '', health_card_number: '', insurance_info: '', notes: '' });
  const [conditions, setConditions] = useState('');
  const [allergies, setAllergies] = useState('');
  const [interests, setInterests] = useState('');
  const [favoriteFoods, setFavoriteFoods] = useState('');

  useFocusEffect(useCallback(() => {
    if (!selectedRecipientId) { setLoading(false); return; }
    (async () => {
      try {
        const data = await api.get(`/care-recipients/${selectedRecipientId}`);
        setForm({ name: data.name || '', date_of_birth: data.date_of_birth || '', gender: data.gender || '', address: data.address || '', phone: data.phone || '', blood_type: data.blood_type || '', health_card_number: data.health_card_number || '', insurance_info: data.insurance_info || '', notes: data.notes || '' });
        setConditions((data.medical_conditions || []).join(', '));
        setAllergies((data.allergies || []).join(', '));
        setInterests((data.interests || []).join(', '));
        setFavoriteFoods((data.favorite_foods || []).join(', '));
      } catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, [selectedRecipientId]));

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Required', 'Name is required'); return; }
    setSaving(true);
    try {
      await api.put(`/care-recipients/${selectedRecipientId}`, {
        ...form,
        medical_conditions: conditions ? conditions.split(',').map(s => s.trim()).filter(Boolean) : [],
        allergies: allergies ? allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        interests: interests ? interests.split(',').map(s => s.trim()).filter(Boolean) : [],
        favorite_foods: favoriteFoods ? favoriteFoods.split(',').map(s => s.trim()).filter(Boolean) : [],
      });
      router.back();
    } catch (e: any) { Alert.alert('Error', e.message); } finally { setSaving(false); }
  };

  if (loading) return <SafeAreaView style={s.container}><View style={s.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeAreaView>;

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={s.header}><TouchableOpacity testID="close-edit" onPress={() => router.back()}><Ionicons name="close" size={28} color={COLORS.textPrimary} /></TouchableOpacity><Text style={s.headerTitle}>Edit Profile</Text>
          <TouchableOpacity testID="save-edit-btn" onPress={handleSave} disabled={saving}>{saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={s.saveText}>Save</Text>}</TouchableOpacity></View>
        <ScrollView style={s.body} keyboardShouldPersistTaps="handled">
          {[{ k: 'name', l: 'Full Name *', p: 'Name' },{ k: 'date_of_birth', l: 'Date of Birth', p: 'YYYY-MM-DD' },{ k: 'gender', l: 'Gender', p: 'Gender' },{ k: 'phone', l: 'Phone', p: 'Phone' },{ k: 'address', l: 'Address', p: 'Address' },{ k: 'blood_type', l: 'Blood Type', p: 'e.g., O+' },{ k: 'health_card_number', l: 'Health Card #', p: 'Number' },{ k: 'insurance_info', l: 'Insurance', p: 'Insurance info' }].map(({ k, l, p }) => (
            <View key={k} style={s.fg}><Text style={s.fl}>{l}</Text><TextInput testID={`edit-${k}`} style={s.fi} placeholder={p} placeholderTextColor={COLORS.border} value={(form as any)[k]} onChangeText={v => setForm({ ...form, [k]: v })} /></View>))}
          <View style={s.fg}><Text style={s.fl}>Medical Conditions</Text><TextInput testID="edit-conditions" style={s.ta} placeholder="Comma-separated" placeholderTextColor={COLORS.border} value={conditions} onChangeText={setConditions} multiline /></View>
          <View style={s.fg}><Text style={s.fl}>Allergies</Text><TextInput testID="edit-allergies" style={s.ta} placeholder="Comma-separated" placeholderTextColor={COLORS.border} value={allergies} onChangeText={setAllergies} multiline /></View>
          <View style={s.fg}><Text style={s.fl}>Interests & Hobbies</Text><TextInput testID="edit-interests" style={s.ta} placeholder="Comma-separated (e.g., Reading, Gardening)" placeholderTextColor={COLORS.border} value={interests} onChangeText={setInterests} multiline /></View>
          <View style={s.fg}><Text style={s.fl}>Favorite Foods</Text><TextInput testID="edit-favorite-foods" style={s.ta} placeholder="Comma-separated (e.g., Chicken soup, Apple pie)" placeholderTextColor={COLORS.border} value={favoriteFoods} onChangeText={setFavoriteFoods} multiline /></View>
          <View style={s.fg}><Text style={s.fl}>Notes</Text><TextInput testID="edit-notes" style={s.ta} placeholder="Notes" placeholderTextColor={COLORS.border} value={form.notes} onChangeText={v => setForm({ ...form, notes: v })} multiline /></View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background }, centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary }, saveText: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '700' },
  body: { padding: SPACING.lg },
  fg: { marginBottom: SPACING.md }, fl: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  fi: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: SPACING.md, height: 48, fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
  ta: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, padding: SPACING.md, fontSize: FONT_SIZES.md, color: COLORS.textPrimary, minHeight: 60 },
});
