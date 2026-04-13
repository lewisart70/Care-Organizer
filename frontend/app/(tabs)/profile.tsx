import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Image, Alert, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../../src/constants/theme';

export default function ProfileScreen() {
  const { selectedRecipientId } = useAuth();
  const router = useRouter();
  const [recipient, setRecipient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!selectedRecipientId) { setLoading(false); return; }
    try {
      const data = await api.get(`/care-recipients/${selectedRecipientId}`);
      setRecipient(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [selectedRecipientId]);

  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library to change the profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      uploadProfilePicture(result.assets[0].base64!);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow camera access to take a profile picture.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      uploadProfilePicture(result.assets[0].base64!);
    }
  };

  const uploadProfilePicture = async (base64Image: string) => {
    setUploadingPhoto(true);
    try {
      await api.patch(`/care-recipients/${selectedRecipientId}`, {
        profile_picture: `data:image/jpeg;base64,${base64Image}`
      });
      await loadProfile();
      Alert.alert('Success', 'Profile picture updated!');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to upload picture');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const showPhotoOptions = () => {
    if (Platform.OS === 'web') {
      // Use modal for web since Alert.alert doesn't work properly
      setShowPhotoModal(true);
    } else {
      Alert.alert('Change Profile Picture', 'Choose an option', [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handlePhotoOption = (option: 'camera' | 'library') => {
    setShowPhotoModal(false);
    if (option === 'camera') {
      takePhoto();
    } else {
      pickImage();
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    </SafeAreaView>
  );

  if (!recipient) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <View style={styles.emptyIconWrapper}>
            <View style={[styles.emptyIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="person-add" size={48} color={COLORS.primary} />
            </View>
          </View>
          <Text style={styles.emptyTitle}>No Care Recipient</Text>
          <Text style={styles.emptyText}>Add someone you are caring for to get started</Text>
          <TouchableOpacity testID="add-recipient-profile-btn" style={styles.addBtn} onPress={() => router.push('/add-recipient')} activeOpacity={0.8}>
            <View style={[styles.addBtnGradient, { backgroundColor: COLORS.primary }]}>
              <Ionicons name="add" size={20} color={COLORS.white} />
              <Text style={styles.addBtnText}>Add Care Recipient</Text>
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const infoItems = [
    { icon: 'calendar', label: 'Date of Birth', value: recipient.date_of_birth, color: COLORS.info },
    { icon: 'person', label: 'Gender', value: recipient.gender, color: COLORS.secondary },
    { icon: 'location', label: 'Address', value: recipient.address, color: COLORS.warning },
    { icon: 'call', label: 'Phone', value: recipient.phone, color: COLORS.success },
    { icon: 'water', label: 'Blood Type', value: recipient.blood_type, color: COLORS.error },
    { icon: 'card', label: 'Health Card', value: recipient.health_card_number, color: COLORS.primary },
    { icon: 'shield-checkmark', label: 'Insurance', value: recipient.insurance_info, color: '#8E44AD' },
  ];

  const age = calculateAge(recipient.date_of_birth);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProfile(); }} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Care Profile</Text>
          <TouchableOpacity testID="edit-profile-btn" style={styles.editButton} onPress={() => router.push('/edit-profile')} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileCardWrapper}>
          <View style={styles.profileCardGradient}>
            <View style={styles.profileCard}>
              <TouchableOpacity onPress={showPhotoOptions} style={styles.avatarContainer} disabled={uploadingPhoto} activeOpacity={0.8}>
                <View style={styles.avatarWrapper}>
                  {uploadingPhoto ? (
                    <View style={[styles.avatar, { backgroundColor: COLORS.primary }]}><ActivityIndicator color={COLORS.white} /></View>
                  ) : recipient.profile_picture ? (
                    <Image source={{ uri: recipient.profile_picture }} style={styles.avatarImage} />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: COLORS.primary }]}><Text style={styles.avatarText}>{recipient.name?.charAt(0)?.toUpperCase()}</Text></View>
                  )}
                </View>
                <View style={styles.cameraButton}><Ionicons name="camera" size={14} color={COLORS.white} /></View>
              </TouchableOpacity>
              <Text style={styles.name}>{recipient.name}</Text>
              {age ? <Text style={styles.age}>{age} years old</Text> : null}
              <Text style={styles.tapHint}>Tap photo to change</Text>
              {recipient.notes ? (
                <View style={styles.bioContainer}><Text style={styles.bio}>{recipient.notes}</Text></View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="medical" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{recipient.medical_conditions?.length || 0}</Text>
            <Text style={styles.statLabel}>Conditions</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.warningLight }]}>
              <Ionicons name="alert-circle" size={18} color={COLORS.warning} />
            </View>
            <Text style={styles.statValue}>{recipient.allergies?.length || 0}</Text>
            <Text style={styles.statLabel}>Allergies</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.secondaryLight }]}>
              <Ionicons name="heart" size={18} color={COLORS.secondary} />
            </View>
            <Text style={styles.statValue}>{recipient.interests?.length || 0}</Text>
            <Text style={styles.statLabel}>Interests</Text>
          </View>
        </View>

        {/* Personal Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.infoCard}>
            {infoItems.filter(i => i.value).map((item, index) => (
              <View key={item.label} style={[styles.infoRow, index === infoItems.filter(i => i.value).length - 1 && styles.infoRowLast]}>
                <View style={[styles.infoIcon, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon as any} size={18} color={item.color} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              </View>
            ))}
            {infoItems.filter(i => i.value).length === 0 && (
              <View style={styles.emptyInfo}>
                <Text style={styles.emptyInfoText}>No personal information added yet</Text>
                <TouchableOpacity onPress={() => router.push('/edit-profile')}>
                  <Text style={styles.emptyInfoLink}>Add Details</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Medical Conditions */}
        {recipient.medical_conditions?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medical Conditions</Text>
            <View style={styles.tagContainer}>
              {recipient.medical_conditions.map((c: string) => (
                <View key={c} style={[styles.tag, { backgroundColor: COLORS.errorLight, borderColor: COLORS.error + '30' }]}>
                  <Ionicons name="medical" size={12} color={COLORS.error} />
                  <Text style={[styles.tagText, { color: COLORS.error }]}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Allergies */}
        {recipient.allergies?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Allergies</Text>
            <View style={styles.tagContainer}>
              {recipient.allergies.map((a: string) => (
                <View key={a} style={[styles.tag, { backgroundColor: COLORS.warningLight, borderColor: COLORS.warning + '30' }]}>
                  <Ionicons name="alert-circle" size={12} color={COLORS.warning} />
                  <Text style={[styles.tagText, { color: '#B8860B' }]}>{a}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Interests */}
        {recipient.interests?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests & Hobbies</Text>
            <View style={styles.tagContainer}>
              {recipient.interests.map((i: string) => (
                <View key={i} style={[styles.tag, { backgroundColor: COLORS.secondaryLight, borderColor: COLORS.secondary + '30' }]}>
                  <Ionicons name="heart" size={12} color={COLORS.secondary} />
                  <Text style={[styles.tagText, { color: COLORS.secondaryDark }]}>{i}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: SPACING.xxxl }} />
      </ScrollView>

      {/* Photo Options Modal for Web */}
      <Modal visible={showPhotoModal} transparent animationType="fade">
        <View style={styles.photoModalOverlay}>
          <View style={styles.photoModalContent}>
            <Text style={styles.photoModalTitle}>Change Profile Picture</Text>
            <Text style={styles.photoModalSubtitle}>Choose an option</Text>
            
            <TouchableOpacity 
              style={styles.photoModalOption} 
              onPress={() => handlePhotoOption('camera')}
              activeOpacity={0.7}
            >
              <View style={[styles.photoModalIcon, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="camera" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.photoModalOptionText}>Take Photo</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.photoModalOption} 
              onPress={() => handlePhotoOption('library')}
              activeOpacity={0.7}
            >
              <View style={[styles.photoModalIcon, { backgroundColor: COLORS.secondaryLight }]}>
                <Ionicons name="images" size={24} color={COLORS.secondary} />
              </View>
              <Text style={styles.photoModalOptionText}>Choose from Library</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.photoModalCancel} 
              onPress={() => setShowPhotoModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.photoModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingBottom: SPACING.xl,
  },

  // Header
  header: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: SPACING.xl, 
    paddingTop: SPACING.lg, 
    paddingBottom: SPACING.md,
  },
  headerTitle: { 
    fontSize: FONT_SIZES.xxxl, 
    fontWeight: '800', 
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },

  // Profile Card
  profileCardWrapper: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.xxl,
    ...SHADOWS.lg,
  },
  profileCardGradient: {
    borderRadius: RADIUS.xxl,
    padding: 1,
  },
  profileCard: {
    alignItems: 'center', 
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xxl - 1,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  avatarWrapper: {
    ...SHADOWS.lg,
    borderRadius: 60,
  },
  avatar: {
    width: 120, 
    height: 120, 
    borderRadius: 60,
    justifyContent: 'center', 
    alignItems: 'center',
  },
  avatarImage: {
    width: 120, 
    height: 120, 
    borderRadius: 60,
  },
  avatarText: { 
    fontSize: 48, 
    fontWeight: '800', 
    color: COLORS.white,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: COLORS.secondary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.surface,
    ...SHADOWS.md,
  },
  name: { 
    fontSize: FONT_SIZES.xxl, 
    fontWeight: '800', 
    color: COLORS.textPrimary,
  },
  age: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  tapHint: { 
    fontSize: FONT_SIZES.xs, 
    color: COLORS.textMuted, 
    marginTop: SPACING.xs,
  },
  bioContainer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    width: '100%',
  },
  bio: { 
    fontSize: FONT_SIZES.sm, 
    color: COLORS.textSecondary, 
    textAlign: 'center',
    lineHeight: 20,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },

  // Section
  section: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  sectionTitle: { 
    fontSize: FONT_SIZES.sm, 
    fontWeight: '700', 
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },

  // Info Card
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  infoRow: {
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: SPACING.lg,
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.borderLight,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoIcon: {
    width: 40, 
    height: 40, 
    borderRadius: 12,
    justifyContent: 'center', 
    alignItems: 'center', 
  },
  infoContent: { 
    flex: 1,
    marginLeft: SPACING.md,
  },
  infoLabel: { 
    fontSize: FONT_SIZES.xs, 
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: { 
    fontSize: FONT_SIZES.md, 
    color: COLORS.textPrimary, 
    fontWeight: '600',
    marginTop: 2,
  },
  emptyInfo: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyInfoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  emptyInfoLink: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: SPACING.sm,
  },

  // Tags
  tagContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  tag: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md, 
    paddingVertical: SPACING.sm, 
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  tagText: { 
    fontSize: FONT_SIZES.sm, 
    fontWeight: '600',
  },

  // Empty State
  emptyIconWrapper: {
    marginBottom: SPACING.xl,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: { 
    fontSize: FONT_SIZES.xl, 
    fontWeight: '700', 
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptyText: { 
    fontSize: FONT_SIZES.md, 
    color: COLORS.textSecondary, 
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  addBtn: {
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  addBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md, 
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  addBtnText: { 
    color: COLORS.white, 
    fontWeight: '700', 
    fontSize: FONT_SIZES.md,
  },

  // Photo Modal Styles
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  photoModalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  photoModalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  photoModalSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  photoModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  photoModalIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  photoModalOptionText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  photoModalCancel: {
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  photoModalCancelText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
