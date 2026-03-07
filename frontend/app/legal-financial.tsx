import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Modal, Alert, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';

const ITEM_TYPES = [
  { key: 'legal', label: 'Legal', icon: 'document-text', color: COLORS.info },
  { key: 'financial', label: 'Financial', icon: 'cash', color: COLORS.success },
  { key: 'insurance', label: 'Insurance', icon: 'shield-checkmark', color: COLORS.primary },
  { key: 'estate', label: 'Estate', icon: 'home', color: '#9B59B6' },
];

export default function LegalFinancialScreen() {
  const { selectedRecipientId } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState({ 
    item_type: 'legal', title: '', description: '', status: 'pending', 
    due_date: '', contact_person: '', notes: '', image: '' 
  });
  const [saving, setSaving] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedRecipientId) { setLoading(false); return; }
    try { setItems(await api.get(`/care-recipients/${selectedRecipientId}/legal-financial`)); } 
    catch (e) { console.error(e); } 
    finally { setLoading(false); }
  }, [selectedRecipientId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAddModal = () => {
    setEditingItem(null);
    setForm({ item_type: 'legal', title: '', description: '', status: 'pending', due_date: '', contact_person: '', notes: '', image: '' });
    setShowAdd(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setForm({
      item_type: item.item_type || 'legal',
      title: item.title || '',
      description: item.description || '',
      status: item.status || 'pending',
      due_date: item.due_date || '',
      contact_person: item.contact_person || '',
      notes: item.notes || '',
      image: item.image || '',
    });
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { Alert.alert('Required', 'Title is required'); return; }
    setSaving(true);
    try { 
      if (editingItem) {
        await api.put(`/care-recipients/${selectedRecipientId}/legal-financial/${editingItem.item_id}`, form);
        Alert.alert('Updated', 'Item updated successfully');
      } else {
        await api.post(`/care-recipients/${selectedRecipientId}/legal-financial`, form); 
      }
      setShowAdd(false); 
      setEditingItem(null);
      setForm({ item_type: 'legal', title: '', description: '', status: 'pending', due_date: '', contact_person: '', notes: '', image: '' }); 
      await load(); 
    }
    catch (e: any) { Alert.alert('Error', e.message); } 
    finally { setSaving(false); }
  };

  const handleDelete = (itemId: string, title: string) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try { 
              await api.del(`/care-recipients/${selectedRecipientId}/legal-financial/${itemId}`); 
              await load(); 
            }
            catch (e: any) { Alert.alert('Error', e.message); }
          }
        }
      ]
    );
  };

  const pickImage = async (useCamera: boolean) => {
    try {
      const permissionResult = useCamera 
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permission Required', `Please grant ${useCamera ? 'camera' : 'photo library'} access.`);
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.5,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.5,
            base64: true,
          });

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setForm({ ...form, image: base64Image });
      }
    } catch (e) {
      console.error('Image picker error:', e);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const viewImage = (imageUri: string) => {
    setSelectedImage(imageUri);
    setShowImageModal(true);
  };

  const statusColor = (st: string) => st === 'completed' ? COLORS.success : st === 'in_progress' ? COLORS.warning : COLORS.textSecondary;
  const getTypeInfo = (type: string) => ITEM_TYPES.find(t => t.key === type) || ITEM_TYPES[0];

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity testID="back-legal" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Legal & Financial</Text>
        <TouchableOpacity testID="add-legal-btn" onPress={openAddModal}>
          <Ionicons name="add-circle" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={COLORS.primary} />}>
        {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} /> :
          items.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="document-lock-outline" size={48} color={COLORS.primaryLight} />
              <Text style={s.emptyTitle}>No legal/financial items</Text>
              <Text style={s.emptyText}>Add documents like insurance cards, wills, POA, etc.</Text>
            </View>
          ) :
          items.map(item => {
            const typeInfo = getTypeInfo(item.item_type);
            return (
              <TouchableOpacity 
                key={item.item_id} 
                style={s.card}
                onPress={() => openEditModal(item)}
                activeOpacity={0.7}
              >
                <View style={s.row}>
                  <View style={[s.typeBadge, { backgroundColor: typeInfo.color + '15' }]}>
                    <Ionicons name={typeInfo.icon as any} size={12} color={typeInfo.color} />
                    <Text style={[s.typeText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
                  </View>
                  <View style={s.cardActions}>
                    <View style={[s.statusBadge, { backgroundColor: statusColor(item.status) + '15' }]}>
                      <Text style={[s.statusText, { color: statusColor(item.status) }]}>
                        {item.status?.replace('_', ' ')}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={s.actionBtn}
                      onPress={() => openEditModal(item)}
                    >
                      <Ionicons name="pencil" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={s.actionBtn}
                      onPress={() => handleDelete(item.item_id, item.title)}
                    >
                      <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <Text style={s.cardTitle}>{item.title}</Text>
                {item.description && <Text style={s.cardDesc}>{item.description}</Text>}
                {item.contact_person && (
                  <View style={s.detailRow}>
                    <Ionicons name="person" size={12} color={COLORS.textSecondary} />
                    <Text style={s.sub}>{item.contact_person}</Text>
                  </View>
                )}
                {item.due_date && (
                  <View style={s.detailRow}>
                    <Ionicons name="calendar" size={12} color={COLORS.textSecondary} />
                    <Text style={s.sub}>Due: {item.due_date}</Text>
                  </View>
                )}
                
                {/* Image thumbnail */}
                {item.image && (
                  <TouchableOpacity 
                    style={s.imageThumbnailContainer}
                    onPress={() => viewImage(item.image)}
                  >
                    <Image source={{ uri: item.image }} style={s.imageThumbnail} />
                    <View style={s.imageOverlay}>
                      <Ionicons name="expand" size={16} color={COLORS.white} />
                      <Text style={s.imageOverlayText}>View Document</Text>
                    </View>
                  </TouchableOpacity>
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
            <Text style={s.mTitle}>{editingItem ? 'Edit Item' : 'Add Item'}</Text>
            <TouchableOpacity testID="save-legal-btn" onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={s.save}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={s.mBody} keyboardShouldPersistTaps="handled">
            {/* Type selector */}
            <Text style={s.fl}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
              {ITEM_TYPES.map(t => (
                <TouchableOpacity 
                  key={t.key} 
                  testID={`lf-type-${t.key}`} 
                  style={[s.chip, form.item_type === t.key && { backgroundColor: t.color, borderColor: t.color }]} 
                  onPress={() => setForm({ ...form, item_type: t.key })}
                >
                  <Ionicons name={t.icon as any} size={14} color={form.item_type === t.key ? COLORS.white : t.color} />
                  <Text style={[s.chipText, form.item_type === t.key && { color: COLORS.white }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Status selector */}
            <Text style={s.fl}>Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
              {['pending', 'in_progress', 'completed'].map(st => (
                <TouchableOpacity 
                  key={st} 
                  testID={`lf-status-${st}`} 
                  style={[s.chip, form.status === st && { backgroundColor: statusColor(st), borderColor: statusColor(st) }]} 
                  onPress={() => setForm({ ...form, status: st })}
                >
                  <Text style={[s.chipText, form.status === st && { color: COLORS.white }]}>
                    {st.replace('_', ' ').charAt(0).toUpperCase() + st.replace('_', ' ').slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Form fields */}
            {[
              { k: 'title', l: 'Title *', p: 'e.g., Health Insurance Card' },
              { k: 'description', l: 'Description', p: 'Details about this item', ml: true },
              { k: 'due_date', l: 'Due Date', p: 'YYYY-MM-DD (if applicable)' },
              { k: 'contact_person', l: 'Contact Person', p: 'Lawyer, agent, accountant...' },
              { k: 'notes', l: 'Notes', p: 'Any additional notes' },
            ].map(({ k, l, p, ml }) => (
              <View key={k} style={s.fg}>
                <Text style={s.fl}>{l}</Text>
                <TextInput 
                  testID={`lf-${k}`} 
                  style={ml ? s.ta : s.fi} 
                  placeholder={p} 
                  placeholderTextColor={COLORS.border} 
                  value={(form as any)[k]} 
                  onChangeText={v => setForm({ ...form, [k]: v })} 
                  multiline={!!ml} 
                  textAlignVertical={ml ? 'top' : undefined} 
                />
              </View>
            ))}

            {/* Image upload section */}
            <View style={s.imageSection}>
              <Text style={s.fl}>Document Image</Text>
              <Text style={s.imageHelp}>Take a photo or upload an image of the document (insurance card, will, etc.)</Text>
              
              {form.image ? (
                <View style={s.imagePreviewContainer}>
                  <Image source={{ uri: form.image }} style={s.imagePreview} />
                  <View style={s.imagePreviewActions}>
                    <TouchableOpacity 
                      style={s.changeImageBtn}
                      onPress={() => pickImage(true)}
                    >
                      <Ionicons name="camera" size={16} color={COLORS.primary} />
                      <Text style={s.changeImageText}>Retake</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={s.removeImageBtn}
                      onPress={() => setForm({ ...form, image: '' })}
                    >
                      <Ionicons name="trash" size={16} color={COLORS.error} />
                      <Text style={s.removeImageText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={s.imageButtons}>
                  <TouchableOpacity 
                    testID="take-photo-btn"
                    style={s.imageBtn}
                    onPress={() => pickImage(true)}
                  >
                    <Ionicons name="camera" size={24} color={COLORS.primary} />
                    <Text style={s.imageBtnText}>Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    testID="choose-photo-btn"
                    style={s.imageBtn}
                    onPress={() => pickImage(false)}
                  >
                    <Ionicons name="images" size={24} color={COLORS.primary} />
                    <Text style={s.imageBtnText}>Choose Photo</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Full Image View Modal */}
      <Modal visible={showImageModal} animationType="fade" transparent>
        <View style={s.imageModalOverlay}>
          <TouchableOpacity 
            style={s.imageModalClose}
            onPress={() => setShowImageModal(false)}
          >
            <Ionicons name="close-circle" size={36} color={COLORS.white} />
          </TouchableOpacity>
          {selectedImage && (
            <Image 
              source={{ uri: selectedImage }} 
              style={s.fullImage} 
              resizeMode="contain"
            />
          )}
        </View>
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
  emptyText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs, textAlign: 'center', paddingHorizontal: SPACING.xl },
  
  card: { marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  actionBtn: { padding: SPACING.xs, borderRadius: RADIUS.md },
  
  typeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full, gap: 4 },
  typeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  
  cardTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.xs },
  cardDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  sub: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  
  imageThumbnailContainer: { marginTop: SPACING.sm, borderRadius: RADIUS.md, overflow: 'hidden', position: 'relative' },
  imageThumbnail: { width: '100%', height: 120, borderRadius: RADIUS.md },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: SPACING.xs, gap: 4 },
  imageOverlayText: { color: COLORS.white, fontSize: FONT_SIZES.xs, fontWeight: '600' },
  
  editHint: { alignItems: 'flex-end', marginTop: SPACING.xs },
  editHintText: { fontSize: FONT_SIZES.xs, color: COLORS.border, fontStyle: 'italic' },
  
  modal: { flex: 1, backgroundColor: COLORS.background },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  mTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  cancel: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  save: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '700' },
  mBody: { padding: SPACING.lg },
  
  fg: { marginBottom: SPACING.md },
  fl: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  fi: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: SPACING.md, height: 48, fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
  ta: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, padding: SPACING.md, fontSize: FONT_SIZES.md, color: COLORS.textPrimary, minHeight: 80, textAlignVertical: 'top' },
  
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, marginRight: SPACING.sm, gap: 4 },
  chipText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textSecondary },
  
  // Image section styles
  imageSection: { marginTop: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border },
  imageHelp: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginBottom: SPACING.md },
  imageButtons: { flexDirection: 'row', gap: SPACING.md },
  imageBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg, backgroundColor: COLORS.primary + '10', borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.primary + '30', borderStyle: 'dashed' },
  imageBtnText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.primary, marginTop: SPACING.xs },
  
  imagePreviewContainer: { alignItems: 'center' },
  imagePreview: { width: '100%', height: 200, borderRadius: RADIUS.lg },
  imagePreviewActions: { flexDirection: 'row', marginTop: SPACING.sm, gap: SPACING.md },
  changeImageBtn: { flexDirection: 'row', alignItems: 'center', padding: SPACING.sm, borderRadius: RADIUS.md, backgroundColor: COLORS.primary + '15', gap: 4 },
  changeImageText: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: '600' },
  removeImageBtn: { flexDirection: 'row', alignItems: 'center', padding: SPACING.sm, borderRadius: RADIUS.md, backgroundColor: COLORS.error + '15', gap: 4 },
  removeImageText: { fontSize: FONT_SIZES.sm, color: COLORS.error, fontWeight: '600' },
  
  // Full image modal
  imageModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  imageModalClose: { position: 'absolute', top: 50, right: 20, zIndex: 1 },
  fullImage: { width: '95%', height: '80%' },
});
