import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Modal, Alert, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';
import LegalItemCard from '../src/components/legal-financial/LegalItemCard';

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

  // Password protection states
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [passwordHint, setPasswordHint] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  
  // Password settings
  const [isPrimary, setIsPrimary] = useState(false);
  const [showPasswordSettings, setShowPasswordSettings] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordHint, setNewPasswordHint] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Check if password is required
  const checkAccess = useCallback(async () => {
    if (!selectedRecipientId) return;
    try {
      const [recipientData, primaryCheck] = await Promise.all([
        api.get(`/care-recipients/${selectedRecipientId}`),
        api.get(`/care-recipients/${selectedRecipientId}/legal-financial/is-primary`)
      ]);
      
      setHasPassword(recipientData.has_legal_password || false);
      setPasswordHint(recipientData.legal_financial_password_hint || '');
      setIsPrimary(primaryCheck.is_primary);
      
      if (recipientData.has_legal_password) {
        setShowPasswordPrompt(true);
      } else {
        setIsUnlocked(true);
      }
    } catch (e) {
      console.error('Error checking access:', e);
      setIsUnlocked(true); // Allow access if check fails
    }
  }, [selectedRecipientId]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  const load = useCallback(async () => {
    if (!selectedRecipientId || !isUnlocked) { setLoading(false); return; }
    try { setItems(await api.get(`/care-recipients/${selectedRecipientId}/legal-financial`)); } 
    catch (e) { console.error(e); } 
    finally { setLoading(false); }
  }, [selectedRecipientId, isUnlocked]);

  useFocusEffect(useCallback(() => { 
    if (isUnlocked) load(); 
  }, [load, isUnlocked]));

  const verifyPassword = async () => {
    if (!enteredPassword.trim()) {
      Alert.alert('Required', 'Please enter the password');
      return;
    }
    setVerifying(true);
    try {
      const result = await api.post(`/care-recipients/${selectedRecipientId}/legal-financial/verify-password`, {
        password: enteredPassword
      });
      
      if (result.valid) {
        setIsUnlocked(true);
        setShowPasswordPrompt(false);
        setEnteredPassword('');
        setWrongAttempts(0);
        load();
      } else {
        setWrongAttempts(prev => prev + 1);
        setEnteredPassword('');
        Alert.alert(
          'Incorrect Password',
          wrongAttempts >= 1 
            ? 'Password incorrect. Please contact the primary caregiver for access to this section.'
            : 'Please try again or contact the primary caregiver.',
          [{ text: 'OK' }]
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to verify password');
    } finally {
      setVerifying(false);
    }
  };

  const savePassword = async () => {
    if (!isPrimary) {
      Alert.alert('Not Authorized', 'Only the primary caregiver can change the password.');
      return;
    }
    setSavingPassword(true);
    try {
      await api.post(`/care-recipients/${selectedRecipientId}/legal-financial/set-password`, {
        password: newPassword,
        hint: newPasswordHint
      });
      
      setHasPassword(!!newPassword);
      setPasswordHint(newPasswordHint);
      setShowPasswordSettings(false);
      setNewPassword('');
      setNewPasswordHint('');
      
      Alert.alert('Success', newPassword ? 'Password has been set' : 'Password has been removed');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save password');
    } finally {
      setSavingPassword(false);
    }
  };

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

  // Password prompt screen
  if (showPasswordPrompt && !isUnlocked) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity testID="back-legal" onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={s.title}>Legal & Financial</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={s.passwordContainer}>
          <View style={s.lockIcon}>
            <Ionicons name="lock-closed" size={48} color={COLORS.primary} />
          </View>
          <Text style={s.passwordTitle}>Password Protected</Text>
          <Text style={s.passwordSubtitle}>
            This section contains sensitive information and requires a password to access.
          </Text>
          
          {passwordHint && (
            <View style={s.hintContainer}>
              <Ionicons name="bulb" size={16} color={COLORS.warning} />
              <Text style={s.hintText}>Hint: {passwordHint}</Text>
            </View>
          )}
          
          <TextInput
            testID="password-input"
            style={s.passwordInput}
            placeholder="Enter password"
            placeholderTextColor={COLORS.border}
            value={enteredPassword}
            onChangeText={setEnteredPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          
          <TouchableOpacity 
            testID="unlock-btn"
            style={s.unlockBtn}
            onPress={verifyPassword}
            disabled={verifying}
          >
            {verifying ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="lock-open" size={20} color={COLORS.white} />
                <Text style={s.unlockBtnText}>Unlock</Text>
              </>
            )}
          </TouchableOpacity>
          
          {wrongAttempts > 0 && (
            <View style={s.warningBox}>
              <Ionicons name="warning" size={20} color={COLORS.error} />
              <Text style={s.warningText}>
                Incorrect password. If you don't know the password, please contact the primary caregiver.
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity testID="back-legal" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Legal & Financial</Text>
        <View style={s.headerActions}>
          {isPrimary && (
            <TouchableOpacity 
              testID="password-settings-btn"
              style={s.headerBtn}
              onPress={() => setShowPasswordSettings(true)}
            >
              <Ionicons name="key" size={22} color={hasPassword ? COLORS.success : COLORS.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity testID="add-legal-btn" onPress={openAddModal}>
            <Ionicons name="add-circle" size={28} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Password Status Banner */}
      {isPrimary && (
        <TouchableOpacity 
          style={[s.passwordBanner, { backgroundColor: hasPassword ? COLORS.success + '15' : COLORS.warning + '15' }]}
          onPress={() => setShowPasswordSettings(true)}
        >
          <Ionicons 
            name={hasPassword ? "shield-checkmark" : "shield-outline"} 
            size={18} 
            color={hasPassword ? COLORS.success : COLORS.warning} 
          />
          <Text style={[s.passwordBannerText, { color: hasPassword ? COLORS.success : COLORS.warning }]}>
            {hasPassword ? 'Password protected' : 'No password set - Tap to add protection'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={hasPassword ? COLORS.success : COLORS.warning} />
        </TouchableOpacity>
      )}

      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={COLORS.primary} />}>
        {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} /> :
          items.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="document-lock-outline" size={48} color={COLORS.primaryLight} />
              <Text style={s.emptyTitle}>No legal/financial items</Text>
              <Text style={s.emptyText}>Add documents like insurance cards, wills, POA, etc.</Text>
            </View>
          ) :
          items.map(item => (
              <LegalItemCard
                key={item.item_id}
                item={item}
                onEdit={openEditModal}
                onDelete={handleDelete}
                onViewImage={viewImage}
              />
            ))}
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
            <Text style={s.fl}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
              {ITEM_TYPES.map(t => (
                <TouchableOpacity 
                  key={t.key} 
                  style={[s.chip, form.item_type === t.key && { backgroundColor: t.color, borderColor: t.color }]} 
                  onPress={() => setForm({ ...form, item_type: t.key })}
                >
                  <Ionicons name={t.icon as any} size={14} color={form.item_type === t.key ? COLORS.white : t.color} />
                  <Text style={[s.chipText, form.item_type === t.key && { color: COLORS.white }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.fl}>Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
              {['pending', 'in_progress', 'completed'].map(st => (
                <TouchableOpacity 
                  key={st} 
                  style={[s.chip, form.status === st && { backgroundColor: statusColor(st), borderColor: statusColor(st) }]} 
                  onPress={() => setForm({ ...form, status: st })}
                >
                  <Text style={[s.chipText, form.status === st && { color: COLORS.white }]}>
                    {st.replace('_', ' ').charAt(0).toUpperCase() + st.replace('_', ' ').slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

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

            <View style={s.imageSection}>
              <Text style={s.fl}>Document Image</Text>
              <Text style={s.imageHelp}>Take a photo or upload an image of the document</Text>
              
              {form.image ? (
                <View style={s.imagePreviewContainer}>
                  <Image source={{ uri: form.image }} style={s.imagePreview} />
                  <View style={s.imagePreviewActions}>
                    <TouchableOpacity style={s.changeImageBtn} onPress={() => pickImage(true)}>
                      <Ionicons name="camera" size={16} color={COLORS.primary} />
                      <Text style={s.changeImageText}>Retake</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.removeImageBtn} onPress={() => setForm({ ...form, image: '' })}>
                      <Ionicons name="trash" size={16} color={COLORS.error} />
                      <Text style={s.removeImageText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={s.imageButtons}>
                  <TouchableOpacity style={s.imageBtn} onPress={() => pickImage(true)}>
                    <Ionicons name="camera" size={24} color={COLORS.primary} />
                    <Text style={s.imageBtnText}>Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.imageBtn} onPress={() => pickImage(false)}>
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
          <TouchableOpacity style={s.imageModalClose} onPress={() => setShowImageModal(false)}>
            <Ionicons name="close-circle" size={36} color={COLORS.white} />
          </TouchableOpacity>
          {selectedImage && <Image source={{ uri: selectedImage }} style={s.fullImage} resizeMode="contain" />}
        </View>
      </Modal>

      {/* Password Settings Modal */}
      <Modal visible={showPasswordSettings} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.mHeader}>
            <TouchableOpacity onPress={() => { setShowPasswordSettings(false); setNewPassword(''); setNewPasswordHint(''); }}>
              <Text style={s.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.mTitle}>Password Settings</Text>
            <TouchableOpacity onPress={savePassword} disabled={savingPassword}>
              {savingPassword ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={s.save}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={s.mBody}>
            <View style={s.settingsInfo}>
              <Ionicons name="shield-checkmark" size={32} color={COLORS.primary} />
              <Text style={s.settingsTitle}>Protect Sensitive Information</Text>
              <Text style={s.settingsText}>
                Set a password to protect the Legal & Financial section. Other caregivers will need this password to view the contents.
              </Text>
            </View>

            {hasPassword && (
              <View style={s.currentPasswordInfo}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={s.currentPasswordText}>A password is currently set</Text>
              </View>
            )}

            <View style={s.fg}>
              <Text style={s.fl}>{hasPassword ? 'New Password' : 'Password'}</Text>
              <Text style={s.fieldHint}>Leave empty to remove password protection</Text>
              <TextInput
                testID="new-password-input"
                style={s.fi}
                placeholder={hasPassword ? "Enter new password (or leave empty to remove)" : "Create a password"}
                placeholderTextColor={COLORS.border}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={s.fg}>
              <Text style={s.fl}>Password Hint (Optional)</Text>
              <Text style={s.fieldHint}>Help other caregivers remember the password</Text>
              <TextInput
                testID="password-hint-input"
                style={s.fi}
                placeholder="e.g., Family pet's name"
                placeholderTextColor={COLORS.border}
                value={newPasswordHint}
                onChangeText={setNewPasswordHint}
              />
            </View>

            <View style={s.disclaimerBox}>
              <Ionicons name="information-circle" size={20} color={COLORS.info} />
              <Text style={s.disclaimerText}>
                Only you (the primary caregiver) can set, change, or remove the password. Other caregivers will see a message to contact you if they enter the wrong password.
              </Text>
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerBtn: { padding: 4 },
  title: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.textPrimary },
  
  // Password banner
  passwordBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, borderRadius: RADIUS.lg, gap: SPACING.sm },
  passwordBannerText: { flex: 1, fontSize: FONT_SIZES.sm, fontWeight: '600' },
  
  // Password prompt screen
  passwordContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl },
  lockIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg },
  passwordTitle: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  passwordSubtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.lg },
  hintContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.warning + '15', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.lg, marginBottom: SPACING.lg, gap: SPACING.sm },
  hintText: { fontSize: FONT_SIZES.sm, color: COLORS.warning, fontWeight: '600' },
  passwordInput: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: SPACING.md, height: 52, fontSize: FONT_SIZES.md, color: COLORS.textPrimary, marginBottom: SPACING.md },
  unlockBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl, borderRadius: RADIUS.lg, gap: SPACING.sm },
  unlockBtnText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.white },
  warningBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.error + '10', padding: SPACING.md, borderRadius: RADIUS.lg, marginTop: SPACING.lg, gap: SPACING.sm },
  warningText: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.error },
  
  // Password settings
  settingsInfo: { alignItems: 'center', paddingVertical: SPACING.lg, marginBottom: SPACING.lg },
  settingsTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.sm },
  settingsText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs },
  currentPasswordInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.success + '15', padding: SPACING.md, borderRadius: RADIUS.lg, marginBottom: SPACING.lg, gap: SPACING.sm },
  currentPasswordText: { fontSize: FONT_SIZES.sm, color: COLORS.success, fontWeight: '600' },
  fieldHint: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  disclaimerBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.info + '10', padding: SPACING.md, borderRadius: RADIUS.lg, marginTop: SPACING.lg, gap: SPACING.sm },
  disclaimerText: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.info },
  
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
  
  imageModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  imageModalClose: { position: 'absolute', top: 50, right: 20, zIndex: 1 },
  fullImage: { width: '95%', height: '80%' },
});
