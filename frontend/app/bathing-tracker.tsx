import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Modal, Alert, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';

const BATH_TYPES = [
  { key: 'full', label: 'Full Bath', icon: 'water' },
  { key: 'shower', label: 'Shower', icon: 'rainy' },
  { key: 'sponge', label: 'Sponge Bath', icon: 'water-outline' },
  { key: 'partial', label: 'Partial', icon: 'ellipse-outline' },
];

export default function BathingTrackerScreen() {
  const { selectedRecipientId } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    bath_type: 'full', 
    notes: '', 
    assisted_by: '' 
  });
  const [saving, setSaving] = useState(false);
  
  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const load = useCallback(async () => {
    if (!selectedRecipientId) { setLoading(false); return; }
    try { setItems(await api.get(`/care-recipients/${selectedRecipientId}/bathing`)); } 
    catch (e) {  } 
    finally { setLoading(false); }
  }, [selectedRecipientId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAddModal = () => {
    setEditingItem(null);
    const today = new Date();
    setSelectedDate(today);
    setForm({ 
      date: today.toISOString().split('T')[0], 
      bath_type: 'full', 
      notes: '', 
      assisted_by: '' 
    });
    setShowAdd(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    const itemDate = item.date ? new Date(item.date) : new Date();
    setSelectedDate(itemDate);
    setForm({
      date: item.date || new Date().toISOString().split('T')[0],
      bath_type: item.bath_type || 'full',
      notes: item.notes || '',
      assisted_by: item.assisted_by || '',
    });
    setShowAdd(true);
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
      setForm({ ...form, date: date.toISOString().split('T')[0] });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try { 
      if (editingItem) {
        await api.put(`/care-recipients/${selectedRecipientId}/bathing/${editingItem.bathing_id}`, form);
        Alert.alert('Updated', 'Bathing record updated successfully');
      } else {
        await api.post(`/care-recipients/${selectedRecipientId}/bathing`, form); 
      }
      setShowAdd(false); 
      setEditingItem(null);
      setForm({ date: new Date().toISOString().split('T')[0], bath_type: 'full', notes: '', assisted_by: '' }); 
      await load(); 
    }
    catch (e: any) { Alert.alert('Error', e.message); } 
    finally { setSaving(false); }
  };

  const handleDelete = (bathingId: string, date: string) => {
    Alert.alert(
      'Delete Record',
      `Delete bathing record from ${date}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try { 
              await api.del(`/care-recipients/${selectedRecipientId}/bathing/${bathingId}`); 
              await load(); 
            }
            catch (e: any) { Alert.alert('Error', e.message); }
          }
        }
      ]
    );
  };

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getBathTypeInfo = (type: string) => BATH_TYPES.find(t => t.key === type) || BATH_TYPES[0];

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity testID="back-bathing" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Bathing Tracker</Text>
        <TouchableOpacity testID="add-bathing-btn" onPress={openAddModal}>
          <Ionicons name="add-circle" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={COLORS.primary} />}>
        {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} /> :
          items.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="water-outline" size={48} color={COLORS.primaryLight} />
              <Text style={s.emptyTitle}>No bathing records</Text>
              <Text style={s.emptyText}>Track bathing to maintain hygiene routines</Text>
            </View>
          ) :
          items.map(item => {
            const typeInfo = getBathTypeInfo(item.bath_type);
            return (
              <TouchableOpacity 
                key={item.bathing_id} 
                style={s.card}
                onPress={() => openEditModal(item)}
                activeOpacity={0.7}
              >
                <View style={s.row}>
                  <View style={s.iconContainer}>
                    <Ionicons name={typeInfo.icon as any} size={20} color="#9B59B6" />
                  </View>
                  <View style={s.cardContent}>
                    <Text style={s.date}>{formatDisplayDate(item.date)}</Text>
                    <View style={s.typeBadge}>
                      <Text style={s.typeText}>{typeInfo.label}</Text>
                    </View>
                  </View>
                  <View style={s.actions}>
                    <TouchableOpacity 
                      testID={`edit-bath-${item.bathing_id}`}
                      style={s.actionBtn}
                      onPress={() => openEditModal(item)}
                    >
                      <Ionicons name="pencil" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      testID={`del-bath-${item.bathing_id}`}
                      style={s.actionBtn}
                      onPress={() => handleDelete(item.bathing_id, item.date)}
                    >
                      <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                </View>
                {item.assisted_by && (
                  <View style={s.detailRow}>
                    <Ionicons name="person" size={14} color={COLORS.textSecondary} />
                    <Text style={s.sub}>Assisted by: {item.assisted_by}</Text>
                  </View>
                )}
                {item.notes && (
                  <View style={s.detailRow}>
                    <Ionicons name="document-text" size={14} color={COLORS.textSecondary} />
                    <Text style={s.sub}>{item.notes}</Text>
                  </View>
                )}
                <View style={s.editHint}>
                  <Text style={s.editHintText}>Tap to edit</Text>
                </View>
              </TouchableOpacity>
            );
          })}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.mHeader}>
            <TouchableOpacity onPress={() => { setShowAdd(false); setEditingItem(null); }}>
              <Text style={s.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.mTitle}>{editingItem ? 'Edit Record' : 'Log Bathing'}</Text>
            <TouchableOpacity testID="save-bathing-btn" onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={s.save}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={s.mBody}>
            {/* Date Picker */}
            <View style={s.fg}>
              <Text style={s.fl}>Date</Text>
              <TouchableOpacity 
                testID="date-picker-btn"
                style={s.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={20} color={COLORS.primary} />
                <Text style={s.dateButtonText}>{formatDisplayDate(form.date)}</Text>
                <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
              
              {showDatePicker && (
                <View style={s.datePickerContainer}>
                  <DateTimePicker
                    testID="date-picker"
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                    style={s.datePicker}
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity 
                      style={s.datePickerDone}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={s.datePickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Bath Type */}
            <Text style={s.fl}>Type</Text>
            <View style={s.typeGrid}>
              {BATH_TYPES.map(t => (
                <TouchableOpacity 
                  key={t.key} 
                  testID={`bath-type-${t.key}`} 
                  style={[s.typeOption, form.bath_type === t.key && s.typeOptionActive]} 
                  onPress={() => setForm({ ...form, bath_type: t.key })}
                >
                  <Ionicons 
                    name={t.icon as any} 
                    size={24} 
                    color={form.bath_type === t.key ? COLORS.white : '#9B59B6'} 
                  />
                  <Text style={[s.typeOptionText, form.bath_type === t.key && s.typeOptionTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Assisted By */}
            <View style={s.fg}>
              <View style={s.labelRow}>
                <Ionicons name="person" size={16} color={COLORS.textSecondary} />
                <Text style={s.fl}>Assisted By</Text>
              </View>
              <TextInput 
                testID="bath-assisted" 
                style={s.fi} 
                placeholder="Caregiver name (optional)" 
                placeholderTextColor={COLORS.border} 
                value={form.assisted_by} 
                onChangeText={v => setForm({ ...form, assisted_by: v })} 
              />
            </View>

            {/* Notes */}
            <View style={s.fg}>
              <View style={s.labelRow}>
                <Ionicons name="document-text" size={16} color={COLORS.textSecondary} />
                <Text style={s.fl}>Notes</Text>
              </View>
              <TextInput 
                testID="bath-notes" 
                style={s.ta} 
                placeholder="Any notes about this bathing session" 
                placeholderTextColor={COLORS.border} 
                value={form.notes} 
                onChangeText={v => setForm({ ...form, notes: v })} 
                multiline 
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
  title: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.textPrimary },
  
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  emptyText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  
  card: { marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#9B59B6' + '15', justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
  cardContent: { flex: 1 },
  date: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  typeBadge: { alignSelf: 'flex-start', backgroundColor: '#9B59B6' + '15', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full, marginTop: 2 },
  typeText: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: '#9B59B6' },
  
  actions: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: { padding: SPACING.xs, borderRadius: RADIUS.md },
  
  detailRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xs, marginLeft: 52, gap: 6 },
  sub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, flex: 1 },
  
  editHint: { alignItems: 'flex-end', marginTop: SPACING.xs },
  editHintText: { fontSize: FONT_SIZES.xs, color: COLORS.border, fontStyle: 'italic' },
  
  modal: { flex: 1, backgroundColor: COLORS.background },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  mTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  cancel: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  save: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '700' },
  mBody: { padding: SPACING.lg },
  
  fg: { marginBottom: SPACING.lg },
  fl: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.xs },
  
  // Date picker styles
  dateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: SPACING.md, height: 52, gap: SPACING.sm },
  dateButtonText: { flex: 1, fontSize: FONT_SIZES.md, color: COLORS.textPrimary, fontWeight: '600' },
  datePickerContainer: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, marginTop: SPACING.sm, overflow: 'hidden' },
  datePicker: { backgroundColor: COLORS.surface },
  datePickerDone: { alignItems: 'center', padding: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  datePickerDoneText: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '700' },
  
  // Type grid
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  typeOption: { width: '48%', alignItems: 'center', justifyContent: 'center', padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border },
  typeOptionActive: { backgroundColor: '#9B59B6', borderColor: '#9B59B6' },
  typeOptionText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: '#9B59B6', marginTop: SPACING.xs },
  typeOptionTextActive: { color: COLORS.white },
  
  fi: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: SPACING.md, height: 48, fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
  ta: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, padding: SPACING.md, fontSize: FONT_SIZES.md, color: COLORS.textPrimary, minHeight: 100, textAlignVertical: 'top' },
});
