import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Modal, Alert, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';

export default function EmergencyContactsScreen() {
  const { selectedRecipientId } = useAuth();
  const router = useRouter();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [form, setForm] = useState({ name: '', relationship: '', phone: '', email: '', notes: '', is_primary: false });
  const [saving, setSaving] = useState(false);
  
  // DNR and POA state
  const [dnrInfo, setDnrInfo] = useState<any>({ has_dnr: false, dnr_document_photo: null });
  const [poaInfo, setPoaInfo] = useState<any>({ name: '', phone: '', email: '', relationship: '', document_photo: null });
  const [showDnrModal, setShowDnrModal] = useState(false);
  const [showPoaModal, setShowPoaModal] = useState(false);
  const [savingDnr, setSavingDnr] = useState(false);
  const [savingPoa, setSavingPoa] = useState(false);

  const load = useCallback(async () => {
    if (!selectedRecipientId) { setLoading(false); return; }
    try { 
      const [contactsData, recipientData] = await Promise.all([
        api.get(`/care-recipients/${selectedRecipientId}/emergency-contacts`),
        api.get(`/care-recipients/${selectedRecipientId}`)
      ]);
      setContacts(contactsData);
      // Load DNR and POA info from care recipient data
      if (recipientData.dnr_info) setDnrInfo(recipientData.dnr_info);
      if (recipientData.poa_info) setPoaInfo(recipientData.poa_info);
    }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }, [selectedRecipientId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAddModal = () => {
    setEditingContact(null);
    setForm({ name: '', relationship: '', phone: '', email: '', notes: '', is_primary: false });
    setShowAdd(true);
  };

  const openEditModal = (contact: any) => {
    setEditingContact(contact);
    setForm({
      name: contact.name || '',
      relationship: contact.relationship || '',
      phone: contact.phone || '',
      email: contact.email || '',
      notes: contact.notes || '',
      is_primary: contact.is_primary || false,
    });
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) { Alert.alert('Required', 'Name and phone are required'); return; }
    setSaving(true);
    try {
      if (editingContact) {
        // Update existing contact
        await api.put(`/care-recipients/${selectedRecipientId}/emergency-contacts/${editingContact.contact_id}`, form);
        Alert.alert('Updated', 'Contact updated successfully');
      } else {
        // Create new contact
        await api.post(`/care-recipients/${selectedRecipientId}/emergency-contacts`, form);
      }
      setShowAdd(false);
      setEditingContact(null);
      setForm({ name: '', relationship: '', phone: '', email: '', notes: '', is_primary: false });
      await load();
    } catch (e: any) { Alert.alert('Error', e.message); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try { 
              await api.del(`/care-recipients/${selectedRecipientId}/emergency-contacts/${id}`); 
              await load(); 
            }
            catch (e: any) { Alert.alert('Error', e.message); }
          }
        }
      ]
    );
  };

  const pickDnrDocument = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const base64Uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setDnrInfo({ ...dnrInfo, dnr_document_photo: base64Uri });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const takeDnrPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera access is required');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const base64Uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setDnrInfo({ ...dnrInfo, dnr_document_photo: base64Uri });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickPoaDocument = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const base64Uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setPoaInfo({ ...poaInfo, document_photo: base64Uri });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const takePoaPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera access is required');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const base64Uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setPoaInfo({ ...poaInfo, document_photo: base64Uri });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const saveDnrInfo = async () => {
    setSavingDnr(true);
    try {
      await api.patch(`/care-recipients/${selectedRecipientId}`, { dnr_info: dnrInfo });
      setShowDnrModal(false);
      Alert.alert('Saved', 'DNR information has been updated');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSavingDnr(false); }
  };

  const savePoaInfo = async () => {
    setSavingPoa(true);
    try {
      await api.patch(`/care-recipients/${selectedRecipientId}`, { poa_info: poaInfo });
      setShowPoaModal(false);
      Alert.alert('Saved', 'Power of Attorney information has been updated');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSavingPoa(false); }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
        <Text style={s.headerTitle}>Emergency Info</Text>
        <TouchableOpacity testID="add-contact-btn" onPress={openAddModal}>
          <View style={s.addBtn}>
            <Ionicons name="add" size={22} color={COLORS.white} />
          </View>
        </TouchableOpacity>
      </View>
      
      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={COLORS.primary} />}>
        {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} /> : (
          <>
            {/* Critical Documents Section */}
            <View style={s.sectionHeader}>
              <Ionicons name="document-text" size={20} color={COLORS.error} />
              <Text style={s.sectionTitle}>Critical Documents</Text>
            </View>
            
            {/* DNR Card */}
            <TouchableOpacity style={s.docCard} onPress={() => setShowDnrModal(true)}>
              <View style={[s.docIcon, { backgroundColor: dnrInfo.has_dnr ? COLORS.error + '20' : COLORS.border + '30' }]}>
                <Ionicons name="document" size={24} color={dnrInfo.has_dnr ? COLORS.error : COLORS.textSecondary} />
              </View>
              <View style={s.docInfo}>
                <Text style={s.docTitle}>Do Not Resuscitate (DNR)</Text>
                <View style={s.docStatus}>
                  <View style={[s.statusBadge, { backgroundColor: dnrInfo.has_dnr ? COLORS.error + '15' : COLORS.border + '30' }]}>
                    <Text style={[s.statusText, { color: dnrInfo.has_dnr ? COLORS.error : COLORS.textSecondary }]}>
                      {dnrInfo.has_dnr ? 'On File' : 'Not on File'}
                    </Text>
                  </View>
                  {dnrInfo.dnr_document_photo && (
                    <View style={s.photoIndicator}>
                      <Ionicons name="camera" size={12} color={COLORS.secondary} />
                      <Text style={s.photoIndicatorText}>Photo</Text>
                    </View>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>

            {/* POA Card */}
            <TouchableOpacity style={s.docCard} onPress={() => setShowPoaModal(true)}>
              <View style={[s.docIcon, { backgroundColor: poaInfo.name ? COLORS.info + '20' : COLORS.border + '30' }]}>
                <Ionicons name="shield-checkmark" size={24} color={poaInfo.name ? COLORS.info : COLORS.textSecondary} />
              </View>
              <View style={s.docInfo}>
                <Text style={s.docTitle}>Power of Attorney</Text>
                {poaInfo.name ? (
                  <Text style={s.docSubtext}>{poaInfo.name} • {poaInfo.relationship || 'Contact'}</Text>
                ) : (
                  <Text style={s.docSubtextEmpty}>Tap to add POA contact</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>

            {/* Emergency Contacts Section */}
            <View style={[s.sectionHeader, { marginTop: SPACING.lg }]}>
              <Ionicons name="call" size={20} color={COLORS.primary} />
              <Text style={s.sectionTitle}>Emergency Contacts</Text>
            </View>

            {contacts.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="call-outline" size={48} color={COLORS.primaryLight} />
                <Text style={s.emptyTitle}>No emergency contacts</Text>
                <Text style={s.emptyText}>Add important contacts for quick access</Text>
              </View>
            ) : contacts.map(c => (
              <TouchableOpacity key={c.contact_id} style={[s.card, c.is_primary && s.primaryCard]} onPress={() => openEditModal(c)} activeOpacity={0.7}>
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
                  <View style={s.cardActions}>
                    <TouchableOpacity testID={`edit-contact-${c.contact_id}`} style={s.actionBtn} onPress={() => openEditModal(c)}>
                      <Ionicons name="pencil" size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity testID={`delete-contact-${c.contact_id}`} style={s.actionBtn} onPress={() => handleDelete(c.contact_id, c.name)}>
                      <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={s.contactDetails}>
                  <View style={s.detailRow}><Ionicons name="call" size={16} color={COLORS.primary} /><Text style={s.detailText}>{c.phone}</Text></View>
                  {c.email ? <View style={s.detailRow}><Ionicons name="mail" size={16} color={COLORS.primary} /><Text style={s.detailText}>{c.email}</Text></View> : null}
                </View>
                <View style={s.editHint}>
                  <Text style={s.editHintText}>Tap to edit</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add/Edit Contact Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => { setShowAdd(false); setEditingContact(null); }}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>{editingContact ? 'Edit Contact' : 'Add Contact'}</Text>
            <TouchableOpacity testID="save-contact-btn" onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={s.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={s.modalBody}>
            {[{ k: 'name', l: 'Name *', p: 'Contact name' }, { k: 'relationship', l: 'Relationship', p: 'e.g., Daughter' }, { k: 'phone', l: 'Phone *', p: 'Phone number', kb: 'phone-pad' }, { k: 'email', l: 'Email', p: 'Email address', kb: 'email-address' }, { k: 'notes', l: 'Notes', p: 'Any notes' }].map(({ k, l, p, kb }) => (
              <View key={k} style={s.formGroup}>
                <Text style={s.formLabel}>{l}</Text>
                <TextInput testID={`contact-${k}`} style={s.formInput} placeholder={p} placeholderTextColor={COLORS.border} value={(form as any)[k]} onChangeText={v => setForm({ ...form, [k]: v })} keyboardType={(kb as any) || 'default'} autoCapitalize={k === 'email' ? 'none' : 'words'} />
              </View>
            ))}
            <TouchableOpacity testID="toggle-primary" style={s.toggleRow} onPress={() => setForm({ ...form, is_primary: !form.is_primary })}>
              <Ionicons name={form.is_primary ? 'checkbox' : 'square-outline'} size={24} color={COLORS.primary} />
              <Text style={s.toggleLabel}>Primary Emergency Contact</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* DNR Modal */}
      <Modal visible={showDnrModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowDnrModal(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>DNR Status</Text>
            <TouchableOpacity onPress={saveDnrInfo} disabled={savingDnr}>
              {savingDnr ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={s.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={s.modalBody}>
            <View style={s.dnrWarning}>
              <Ionicons name="warning" size={20} color={COLORS.error} />
              <Text style={s.dnrWarningText}>
                A Do Not Resuscitate (DNR) order indicates that the patient does not wish to receive CPR if their heart stops.
              </Text>
            </View>

            <Text style={s.formLabel}>DNR Status</Text>
            <View style={s.dnrToggleContainer}>
              <TouchableOpacity 
                style={[s.dnrToggleBtn, !dnrInfo.has_dnr && s.dnrToggleBtnActive]} 
                onPress={() => setDnrInfo({ ...dnrInfo, has_dnr: false })}
              >
                <Ionicons name={!dnrInfo.has_dnr ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={!dnrInfo.has_dnr ? COLORS.secondary : COLORS.textSecondary} />
                <Text style={[s.dnrToggleText, !dnrInfo.has_dnr && s.dnrToggleTextActive]}>No DNR on File</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[s.dnrToggleBtn, dnrInfo.has_dnr && s.dnrToggleBtnActiveDnr]} 
                onPress={() => setDnrInfo({ ...dnrInfo, has_dnr: true })}
              >
                <Ionicons name={dnrInfo.has_dnr ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={dnrInfo.has_dnr ? COLORS.error : COLORS.textSecondary} />
                <Text style={[s.dnrToggleText, dnrInfo.has_dnr && s.dnrToggleTextActiveDnr]}>DNR on File</Text>
              </TouchableOpacity>
            </View>

            <Text style={[s.formLabel, { marginTop: SPACING.lg }]}>DNR Document Photo</Text>
            <Text style={s.photoHelpText}>Take a photo or upload the DNR document for reference</Text>
            
            {dnrInfo.dnr_document_photo ? (
              <View style={s.documentPreview}>
                <Image source={{ uri: dnrInfo.dnr_document_photo }} style={s.documentImage} resizeMode="cover" />
                <TouchableOpacity style={s.removePhotoBtn} onPress={() => setDnrInfo({ ...dnrInfo, dnr_document_photo: null })}>
                  <Ionicons name="close-circle" size={28} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.photoButtons}>
                <TouchableOpacity style={s.photoBtn} onPress={takeDnrPhoto}>
                  <Ionicons name="camera" size={24} color={COLORS.primary} />
                  <Text style={s.photoBtnText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.photoBtn} onPress={pickDnrDocument}>
                  <Ionicons name="images" size={24} color={COLORS.primary} />
                  <Text style={s.photoBtnText}>Choose Photo</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* POA Modal */}
      <Modal visible={showPoaModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowPoaModal(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Power of Attorney</Text>
            <TouchableOpacity onPress={savePoaInfo} disabled={savingPoa}>
              {savingPoa ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={s.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={s.modalBody}>
            <View style={s.poaInfo}>
              <Ionicons name="information-circle" size={20} color={COLORS.info} />
              <Text style={s.poaInfoText}>
                The Power of Attorney (POA) is the person legally authorized to make decisions on behalf of your loved one.
              </Text>
            </View>

            {[
              { k: 'name', l: 'POA Name', p: 'Full legal name' },
              { k: 'relationship', l: 'Relationship', p: 'e.g., Son, Daughter' },
              { k: 'phone', l: 'Phone', p: 'Phone number' },
              { k: 'email', l: 'Email', p: 'Email address' },
            ].map(({ k, l, p }) => (
              <View key={k} style={s.formGroup}>
                <Text style={s.formLabel}>{l}</Text>
                <TextInput 
                  style={s.formInput} 
                  placeholder={p} 
                  placeholderTextColor={COLORS.border} 
                  value={(poaInfo as any)[k] || ''} 
                  onChangeText={v => setPoaInfo({ ...poaInfo, [k]: v })} 
                />
              </View>
            ))}

            <Text style={[s.formLabel, { marginTop: SPACING.md }]}>POA Document Photo</Text>
            <Text style={s.photoHelpText}>Upload a photo of the POA document for reference</Text>
            
            {poaInfo.document_photo ? (
              <View style={s.documentPreview}>
                <Image source={{ uri: poaInfo.document_photo }} style={s.documentImage} resizeMode="cover" />
                <TouchableOpacity style={s.removePhotoBtn} onPress={() => setPoaInfo({ ...poaInfo, document_photo: null })}>
                  <Ionicons name="close-circle" size={28} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.photoButtons}>
                <TouchableOpacity style={s.photoBtn} onPress={takePoaPhoto}>
                  <Ionicons name="camera" size={24} color={COLORS.primary} />
                  <Text style={s.photoBtnText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.photoBtn} onPress={pickPoaDocument}>
                  <Ionicons name="images" size={24} color={COLORS.primary} />
                  <Text style={s.photoBtnText}>Choose Photo</Text>
                </TouchableOpacity>
              </View>
            )}
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
  addBtn: { 
    width: 36, height: 36, borderRadius: 18, 
    backgroundColor: COLORS.primary, 
    justifyContent: 'center', alignItems: 'center' 
  },
  
  // Section headers
  sectionHeader: { 
    flexDirection: 'row', alignItems: 'center', 
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
  },
  sectionTitle: { 
    fontSize: FONT_SIZES.md, fontWeight: '700', 
    color: COLORS.textPrimary, marginLeft: SPACING.sm 
  },

  // Document cards
  docCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: SPACING.lg, marginBottom: SPACING.sm,
    padding: SPACING.md, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
  },
  docIcon: {
    width: 48, height: 48, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md,
  },
  docInfo: { flex: 1 },
  docTitle: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
  docStatus: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full },
  statusText: { fontSize: FONT_SIZES.xs, fontWeight: '700' },
  photoIndicator: { flexDirection: 'row', alignItems: 'center', marginLeft: SPACING.sm },
  photoIndicatorText: { fontSize: FONT_SIZES.xs, color: COLORS.secondary, marginLeft: 2 },
  docSubtext: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  docSubtextEmpty: { fontSize: FONT_SIZES.sm, color: COLORS.border, fontStyle: 'italic', marginTop: 2 },

  // Empty state
  empty: { alignItems: 'center', paddingVertical: SPACING.xl },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  emptyText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },

  // Contact cards
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
  cardActions: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: { padding: SPACING.xs, borderRadius: RADIUS.md },
  contactDetails: { marginTop: SPACING.sm, marginLeft: 52 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  detailText: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, marginLeft: SPACING.sm },
  editHint: { alignItems: 'flex-end', marginTop: SPACING.xs },
  editHintText: { fontSize: FONT_SIZES.xs, color: COLORS.border, fontStyle: 'italic' },

  // Modal
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

  // DNR specific
  dnrWarning: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: COLORS.error + '10', padding: SPACING.md,
    borderRadius: RADIUS.lg, marginBottom: SPACING.lg, gap: 10,
  },
  dnrWarningText: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.error, lineHeight: 20 },
  dnrToggleContainer: { gap: SPACING.sm },
  dnrToggleBtn: {
    flexDirection: 'row', alignItems: 'center',
    padding: SPACING.md, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, gap: 10,
  },
  dnrToggleBtnActive: { borderColor: COLORS.secondary, backgroundColor: COLORS.secondary + '10' },
  dnrToggleBtnActiveDnr: { borderColor: COLORS.error, backgroundColor: COLORS.error + '10' },
  dnrToggleText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  dnrToggleTextActive: { color: COLORS.secondary, fontWeight: '600' },
  dnrToggleTextActiveDnr: { color: COLORS.error, fontWeight: '600' },

  // POA specific
  poaInfo: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: COLORS.info + '10', padding: SPACING.md,
    borderRadius: RADIUS.lg, marginBottom: SPACING.lg, gap: 10,
  },
  poaInfoText: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.info, lineHeight: 20 },

  // Photo capture
  photoHelpText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginBottom: SPACING.md },
  photoButtons: { flexDirection: 'row', gap: SPACING.md },
  photoBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: SPACING.lg, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  photoBtnText: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: '600', marginTop: SPACING.xs },
  documentPreview: { position: 'relative', marginBottom: SPACING.md },
  documentImage: { width: '100%', height: 200, borderRadius: RADIUS.lg },
  removePhotoBtn: { position: 'absolute', top: -10, right: -10 },
});
