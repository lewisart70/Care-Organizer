import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Modal, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';

export default function NutritionScreen() {
  const { selectedRecipientId } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ meal_type: 'breakfast', food_items: '', notes: '', date: new Date().toISOString().split('T')[0], dietary_restrictions: '' });
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    if (!selectedRecipientId) { setLoading(false); return; }
    try { setItems(await api.get(`/care-recipients/${selectedRecipientId}/nutrition`)); } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [selectedRecipientId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const handleAdd = async () => {
    if (!form.food_items.trim()) { Alert.alert('Required', 'Food items required'); return; }
    setSaving(true);
    try { await api.post(`/care-recipients/${selectedRecipientId}/nutrition`, form); setShowAdd(false); setForm({ meal_type: 'breakfast', food_items: '', notes: '', date: new Date().toISOString().split('T')[0], dietary_restrictions: '' }); await load(); }
    catch (e: any) { Alert.alert('Error', e.message); } finally { setSaving(false); }
  };
  const mealIcon = (t: string) => t === 'breakfast' ? 'sunny' : t === 'lunch' ? 'restaurant' : t === 'dinner' ? 'moon' : 'cafe';
  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}><TouchableOpacity testID="back-nutrition" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity><Text style={s.title}>Nutrition & Meals</Text><TouchableOpacity testID="add-nutrition-btn" onPress={() => setShowAdd(true)}><Ionicons name="add-circle" size={28} color={COLORS.primary} /></TouchableOpacity></View>
      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={COLORS.primary} />}>
        {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} /> :
          items.length === 0 ? (<View style={s.empty}><Ionicons name="restaurant-outline" size={48} color={COLORS.primaryLight} /><Text style={s.emptyTitle}>No meal records</Text></View>) :
          items.map(i => (<View key={i.nutrition_id} style={s.card}><View style={s.row}><Ionicons name={mealIcon(i.meal_type) as any} size={20} color="#E67E22" /><Text style={s.mealType}>{i.meal_type}</Text><Text style={s.date}>{i.date}</Text></View><Text style={s.food}>{i.food_items}</Text>{i.notes && <Text style={s.sub}>{i.notes}</Text>}</View>))}
      </ScrollView>
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}><View style={s.mHeader}><TouchableOpacity onPress={() => setShowAdd(false)}><Text style={s.cancel}>Cancel</Text></TouchableOpacity><Text style={s.mTitle}>Log Meal</Text><TouchableOpacity testID="save-nutrition-btn" onPress={handleAdd} disabled={saving}>{saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={s.save}>Save</Text>}</TouchableOpacity></View>
          <ScrollView style={s.mBody}>
            <Text style={s.fl}>Meal Type</Text><ScrollView horizontal style={{ marginBottom: SPACING.md }}>{['breakfast', 'lunch', 'dinner', 'snack'].map(t => (<TouchableOpacity key={t} testID={`meal-${t}`} style={[s.chip, form.meal_type === t && s.chipActive]} onPress={() => setForm({ ...form, meal_type: t })}><Text style={[s.chipText, form.meal_type === t && s.chipTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text></TouchableOpacity>))}</ScrollView>
            {[{ k: 'date', l: 'Date', p: 'YYYY-MM-DD' },{ k: 'food_items', l: 'Food Items *', p: 'What was eaten?', ml: true },{ k: 'dietary_restrictions', l: 'Dietary Notes', p: 'Any dietary concerns' },{ k: 'notes', l: 'Notes', p: 'Additional notes' }].map(({ k, l, p, ml }) => (
              <View key={k} style={s.fg}><Text style={s.fl}>{l}</Text><TextInput testID={`nut-${k}`} style={ml ? s.ta : s.fi} placeholder={p} placeholderTextColor={COLORS.border} value={(form as any)[k]} onChangeText={v => setForm({ ...form, [k]: v })} multiline={!!ml} textAlignVertical={ml ? 'top' : undefined} /></View>))}
          </ScrollView></SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md }, title: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.textPrimary },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl }, emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  card: { marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg }, row: { flexDirection: 'row', alignItems: 'center' }, mealType: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary, marginLeft: SPACING.sm, flex: 1, textTransform: 'capitalize' }, date: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  food: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, marginTop: 4, marginLeft: 32 }, sub: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2, marginLeft: 32 },
  modal: { flex: 1, backgroundColor: COLORS.background }, mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border }, mTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary }, cancel: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary }, save: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '700' }, mBody: { padding: SPACING.lg },
  fg: { marginBottom: SPACING.md }, fl: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  fi: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: SPACING.md, height: 48, fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
  ta: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, padding: SPACING.md, fontSize: FONT_SIZES.md, color: COLORS.textPrimary, minHeight: 80 },
  chip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginRight: SPACING.sm }, chipActive: { backgroundColor: '#E67E22', borderColor: '#E67E22' }, chipText: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.textSecondary }, chipTextActive: { color: COLORS.white },
});
