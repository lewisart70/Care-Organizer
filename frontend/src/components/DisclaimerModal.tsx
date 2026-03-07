import React, { useState } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, ScrollView, 
  Modal, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../constants/theme';
import { api } from '../utils/api';

interface DisclaimerModalProps {
  visible: boolean;
  onAccept: () => void;
}

export default function DisclaimerModal({ visible, onAccept }: DisclaimerModalProps) {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!checked) {
      Alert.alert('Required', 'Please check the box to confirm you have read and agree to the terms.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/accept-disclaimer');
      onAccept();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to accept disclaimer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="shield-checkmark" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Privacy & Security</Text>
          <Text style={styles.subtitle}>Please review before continuing</Text>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Welcome Section */}
          <View style={styles.section}>
            <Text style={styles.welcomeText}>
              Welcome to Family Care Organizer! Before you begin, please read and acknowledge our privacy and security guidelines.
            </Text>
          </View>

          {/* Data Protection */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="lock-closed" size={24} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Your Data is Protected</Text>
            </View>
            <Text style={styles.cardText}>
              All information you enter in this app is encrypted and stored securely. We use industry-standard security measures to protect your data.
            </Text>
          </View>

          {/* Privacy Notice */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="eye-off" size={24} color={COLORS.secondary} />
              <Text style={styles.cardTitle}>Privacy Notice</Text>
            </View>
            <Text style={styles.cardText}>
              This app is designed to be used as a caregiver tool. The sensitive information you enter, including medical records, personal details, and care notes, is private and confidential.
            </Text>
          </View>

          {/* Consent Warning */}
          <View style={[styles.card, styles.warningCard]}>
            <View style={styles.cardHeader}>
              <Ionicons name="warning" size={24} color={COLORS.warning} />
              <Text style={[styles.cardTitle, { color: COLORS.warning }]}>Important Notice</Text>
            </View>
            <Text style={styles.cardText}>
              <Text style={styles.bold}>Do not share sensitive information without consent.</Text> Any information stored in this app should only be shared with the explicit consent of the care recipient or their Power of Attorney (POA).
            </Text>
          </View>

          {/* Caregiver Responsibility */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="people" size={24} color={COLORS.info} />
              <Text style={styles.cardTitle}>Caregiver Responsibility</Text>
            </View>
            <Text style={styles.cardText}>
              As a caregiver using this app, you are responsible for:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Keeping your login credentials secure</Text>
              <Text style={styles.bulletItem}>• Only sharing reports with authorized individuals</Text>
              <Text style={styles.bulletItem}>• Obtaining proper consent before sharing information</Text>
              <Text style={styles.bulletItem}>• Logging out when using shared devices</Text>
            </View>
          </View>

          {/* Security Features */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="finger-print" size={24} color={COLORS.success} />
              <Text style={styles.cardTitle}>Security Features</Text>
            </View>
            <Text style={styles.cardText}>
              This app includes security features to help protect sensitive information:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Password protection for legal & financial section</Text>
              <Text style={styles.bulletItem}>• Secure encrypted data storage</Text>
              <Text style={styles.bulletItem}>• Session management and automatic logout</Text>
            </View>
          </View>

          {/* Checkbox */}
          <TouchableOpacity 
            style={styles.checkboxContainer} 
            onPress={() => setChecked(!checked)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
              {checked && <Ionicons name="checkmark" size={18} color={COLORS.white} />}
            </View>
            <Text style={styles.checkboxLabel}>
              I have read and agree to the privacy and security guidelines. I understand my responsibilities as a caregiver using this app.
            </Text>
          </TouchableOpacity>

          {/* Accept Button */}
          <TouchableOpacity 
            style={[styles.acceptButton, !checked && styles.acceptButtonDisabled]}
            onPress={handleAccept}
            disabled={loading || !checked}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.acceptButtonText}>I Agree - Continue</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: SPACING.xxl }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    alignItems: 'center', 
    paddingVertical: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: { fontSize: FONT_SIZES.xxl, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  
  content: { flex: 1, padding: SPACING.lg },
  
  section: { marginBottom: SPACING.lg },
  welcomeText: { 
    fontSize: FONT_SIZES.md, 
    color: COLORS.textPrimary, 
    lineHeight: 24,
    textAlign: 'center',
  },
  
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  warningCard: {
    borderColor: COLORS.warning + '50',
    backgroundColor: COLORS.warning + '08',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, gap: SPACING.sm },
  cardTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  cardText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 22 },
  bold: { fontWeight: '700', color: COLORS.textPrimary },
  
  bulletList: { marginTop: SPACING.sm },
  bulletItem: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 24, marginLeft: SPACING.sm },
  
  checkboxContainer: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.primary + '08',
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primary + '30',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  checkboxLabel: { 
    flex: 1, 
    fontSize: FONT_SIZES.sm, 
    color: COLORS.textPrimary, 
    lineHeight: 22,
    fontWeight: '500',
  },
  
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  acceptButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  acceptButtonText: { 
    fontSize: FONT_SIZES.md, 
    fontWeight: '700', 
    color: COLORS.white 
  },
});
