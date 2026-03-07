import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../src/constants/theme';

export default function ProfileScreen() {
  const { selectedRecipientId } = useAuth();
  const router = useRouter();
  const [recipient, setRecipient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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
    // Request permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library to change the profile picture.');
      return;
    }

    // Launch image picker
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
    // Request camera permission
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow camera access to take a profile picture.');
      return;
    }

    // Launch camera
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
    Alert.alert(
      'Change Profile Picture',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  if (loading) return <SafeAreaView style={styles.container}><View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeAreaView>;

  if (!recipient) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="person-add" size={48} color={COLORS.primaryLight} />
          <Text style={styles.emptyText}>No care recipient selected</Text>
          <TouchableOpacity testID="add-recipient-profile-btn" style={styles.addBtn} onPress={() => router.push('/add-recipient')}>
            <Text style={styles.addBtnText}>Add Care Recipient</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const infoItems = [
    { icon: 'calendar', label: 'Date of Birth', value: recipient.date_of_birth },
    { icon: 'person', label: 'Gender', value: recipient.gender },
    { icon: 'location', label: 'Address', value: recipient.address },
    { icon: 'call', label: 'Phone', value: recipient.phone },
    { icon: 'water', label: 'Blood Type', value: recipient.blood_type },
    { icon: 'card', label: 'Health Card', value: recipient.health_card_number },
    { icon: 'shield-checkmark', label: 'Insurance', value: recipient.insurance_info },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProfile(); }} tintColor={COLORS.primary} />}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Care Profile</Text>
          <TouchableOpacity testID="edit-profile-btn" onPress={() => router.push('/edit-profile')}>
            <Ionicons name="create-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <TouchableOpacity onPress={showPhotoOptions} style={styles.avatarContainer} disabled={uploadingPhoto}>
            {uploadingPhoto ? (
              <View style={styles.avatar}>
                <ActivityIndicator color={COLORS.white} />
              </View>
            ) : recipient.profile_picture ? (
              <Image source={{ uri: recipient.profile_picture }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{recipient.name?.charAt(0)?.toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={14} color={COLORS.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{recipient.name}</Text>
          <Text style={styles.tapHint}>Tap photo to change</Text>
          {recipient.notes ? <Text style={styles.bio}>{recipient.notes}</Text> : null}
        </View>

        <View style={styles.infoSection}>
          {infoItems.filter(i => i.value).map((item) => (
            <View key={item.label} style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name={item.icon as any} size={18} color={COLORS.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {recipient.medical_conditions?.length > 0 && (
          <View style={styles.tagSection}>
            <Text style={styles.tagTitle}>Medical Conditions</Text>
            <View style={styles.tagWrap}>
              {recipient.medical_conditions.map((c: string, i: number) => (
                <View key={i} style={[styles.tag, { backgroundColor: COLORS.error + '15' }]}>
                  <Text style={[styles.tagText, { color: COLORS.error }]}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {recipient.allergies?.length > 0 && (
          <View style={styles.tagSection}>
            <Text style={styles.tagTitle}>Allergies</Text>
            <View style={styles.tagWrap}>
              {recipient.allergies.map((a: string, i: number) => (
                <View key={i} style={[styles.tag, { backgroundColor: COLORS.warning + '15' }]}>
                  <Text style={[styles.tagText, { color: '#B8860B' }]}>{a}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {recipient.interests?.length > 0 && (
          <View style={[styles.tagSection, { marginBottom: SPACING.xxl }]}>
            <Text style={styles.tagTitle}>Interests</Text>
            <View style={styles.tagWrap}>
              {recipient.interests.map((i: string, idx: number) => (
                <View key={idx} style={[styles.tag, { backgroundColor: COLORS.secondary + '15' }]}>
                  <Text style={[styles.tagText, { color: COLORS.secondaryDark }]}>{i}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  emptyText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, marginTop: SPACING.md },
  addBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl, marginTop: SPACING.lg,
  },
  addBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZES.md },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
  },
  headerTitle: { fontSize: FONT_SIZES.xxl, fontWeight: '800', color: COLORS.textPrimary },
  profileCard: {
    alignItems: 'center', paddingVertical: SPACING.lg, marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.sm,
  },
  avatar: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarImage: {
    width: 100, height: 100, borderRadius: 50,
  },
  avatarText: { fontSize: FONT_SIZES.xxxl, fontWeight: '800', color: COLORS.white },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.secondary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.surface,
  },
  name: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.textPrimary },
  tapHint: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  bio: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center', paddingHorizontal: SPACING.lg },
  infoSection: { marginTop: SPACING.lg, paddingHorizontal: SPACING.lg },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border + '50',
  },
  infoIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primaryLight + '20',
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  infoValue: { fontSize: FONT_SIZES.md, color: COLORS.textPrimary, fontWeight: '500' },
  tagSection: { marginTop: SPACING.lg, paddingHorizontal: SPACING.lg },
  tagTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  tag: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, marginRight: SPACING.sm, marginBottom: SPACING.sm },
  tagText: { fontSize: FONT_SIZES.sm, fontWeight: '600' },
});
