import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';

export default function AddRecipientScreen() {
  const { setSelectedRecipientId } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', date_of_birth: '', gender: '', address: '', phone: '',
    blood_type: '', weight: '', blood_pressure: '', blood_pressure_date: '',
    health_card_number: '', insurance_info: '', notes: '',
  });
  const [conditions, setConditions] = useState('');
  const [allergies, setAllergies] = useState('');
  const [interests, setInterests] = useState('');
  const [favoriteFoods, setFavoriteFoods] = useState('');

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Photo library access is required to add a profile photo');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const base64Uri = `data:image/jpeg;base64,${asset.base64}`;
        setProfilePhoto(base64Uri);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera access is required to take a photo');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const base64Uri = `data:image/jpeg;base64,${asset.base64}`;
        setProfilePhoto(base64Uri);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const showPhotoOptions = () => {
    Alert.alert(
      'Add Profile Photo',
      'Choose how to add a photo of the care recipient',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Required', 'Name is required'); return; }
    setSaving(true);
    try {
      const body = {
        ...form,
        medical_conditions: conditions ? conditions.split(',').map(s => s.trim()).filter(Boolean) : [],
        allergies: allergies ? allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        interests: interests ? interests.split(',').map(s => s.trim()).filter(Boolean) : [],
        favorite_foods: favoriteFoods ? favoriteFoods.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      const result = await api.post('/care-recipients', body);
      
      // Get the recipient ID from the response (handle both formats)
      const recipientId = result.recipient_id || result.id;
      
      // Upload profile photo if one was selected
      if (profilePhoto && recipientId) {
        try {
          await api.post(`/care-recipients/${recipientId}/profile-photo`, {
            photo_base64: profilePhoto
          });
        } catch (photoErr) {
          // Don't fail the whole operation if photo upload fails
        }
      }
      
      if (recipientId) {
        setSelectedRecipientId(recipientId);
      }
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
    { key: 'weight', label: 'Weight', placeholder: 'e.g., 150 lbs', icon: 'fitness' },
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
          {/* Profile Photo Section */}
          <View style={styles.photoSection}>
            <TouchableOpacity 
              testID="add-profile-photo-btn"
              style={styles.photoContainer} 
              onPress={showPhotoOptions}
            >
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera" size={32} color={COLORS.textSecondary} />
                  <Text style={styles.photoPlaceholderText}>Add Photo</Text>
                </View>
              )}
              <View style={styles.editBadge}>
                <Ionicons name="pencil" size={12} color={COLORS.white} />
              </View>
            </TouchableOpacity>
            <Text style={styles.photoHint}>
              Add a photo to help PSWs/caregivers identify the client
            </Text>
          </View>

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
          
          {/* Blood Pressure Section */}
          <View style={styles.sectionHeader}>
            <Ionicons name="heart" size={18} color={COLORS.error} />
            <Text style={styles.sectionTitle}>Blood Pressure</Text>
          </View>
          <View style={styles.rowFields}>
            <View style={[styles.formGroup, { flex: 1, marginRight: SPACING.sm }]}>
              <Text style={styles.formLabel}>Reading</Text>
              <TextInput testID="recipient-blood_pressure" style={styles.input} placeholder="e.g., 120/80"
                placeholderTextColor={COLORS.border} value={form.blood_pressure}
                onChangeText={(v) => setForm({ ...form, blood_pressure: v })} />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>Date Taken</Text>
              <TextInput testID="recipient-blood_pressure_date" style={styles.input} placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.border} value={form.blood_pressure_date}
                onChangeText={(v) => setForm({ ...form, blood_pressure_date: v })} />
            </View>
          </View>
          
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
            <Text style={styles.formLabel}>Favorite Foods</Text>
            <TextInput testID="recipient-favorite-foods" style={styles.textArea} placeholder="Comma-separated (e.g., Chicken soup, Apple pie)"
              placeholderTextColor={COLORS.border} value={favoriteFoods} onChangeText={setFavoriteFoods} multiline />
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
  
  // Photo section styles
  photoSection: { alignItems: 'center', marginBottom: SPACING.xl },
  photoContainer: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    overflow: 'hidden',
    position: 'relative',
  },
  profilePhoto: { 
    width: '100%', 
    height: '100%',
  },
  photoPlaceholder: { 
    width: '100%', 
    height: '100%', 
    backgroundColor: COLORS.surface, 
    borderWidth: 2, 
    borderColor: COLORS.border, 
    borderStyle: 'dashed',
    borderRadius: 60,
    justifyContent: 'center', 
    alignItems: 'center',
  },
  photoPlaceholderText: { 
    fontSize: FONT_SIZES.xs, 
    color: COLORS.textSecondary, 
    marginTop: SPACING.xs,
  },
  editBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  photoHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },

  formGroup: { marginBottom: SPACING.md },
  formLabel: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: SPACING.md, height: 48 },
  inputIcon: { marginRight: SPACING.sm },
  input: { flex: 1, fontSize: FONT_SIZES.md, color: COLORS.textPrimary, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: SPACING.md, height: 48 },
  textArea: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, padding: SPACING.md, fontSize: FONT_SIZES.md, color: COLORS.textPrimary, minHeight: 60 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.md, marginBottom: SPACING.md, paddingBottom: SPACING.xs, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sectionTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary, marginLeft: SPACING.sm },
  rowFields: { flexDirection: 'row' },
});
