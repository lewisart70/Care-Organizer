import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Alert, RefreshControl, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';

export default function CaregiversScreen() {
  const { selectedRecipientId } = useAuth();
  const router = useRouter();
  const [caregivers, setCaregivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    if (!selectedRecipientId) { setLoading(false); return; }
    try { 
      setCaregivers(await api.get(`/care-recipients/${selectedRecipientId}/caregivers`)); 
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  }, [selectedRecipientId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSendInvite = async () => {
    if (!email.trim()) { 
      Alert.alert('Required', 'Please enter an email address'); 
      return; 
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setInviting(true);
    try { 
      const res = await api.post(`/care-recipients/${selectedRecipientId}/invite-caregiver`, { 
        email: email.trim(),
        caregiver_name: caregiverName.trim() || null,
        message: personalMessage.trim() || null,
      }); 
      
      // Check if email was actually sent or just recorded
      if (res.email_sent === false && res.email_note) {
        // Email couldn't be sent (Resend free tier limitation)
        Alert.alert(
          'Invitation Recorded 📝', 
          `${res.email_note}\n\nPlease share this info with ${caregiverName.trim() || 'the caregiver'}:\n\n1. Download the FamilyCare app\n2. Sign up with: ${email}`,
          [{ text: 'Got it', onPress: () => setShowInvite(false) }]
        );
      } else {
        // Email was sent successfully
        Alert.alert(
          'Invitation Sent! ✉️', 
          `An email invitation has been sent to ${email}.\n\n${res.user_exists ? 'They already have an account and will see the invitation when they open the app.' : 'They will need to create an account using this email to join your care team.'}`,
          [{ text: 'OK', onPress: () => setShowInvite(false) }]
        );
      }
      
      setEmail(''); 
      setCaregiverName('');
      setPersonalMessage('');
      await load(); 
    }
    catch (e: any) { 
      Alert.alert('Error', e.message || 'Failed to send invitation'); 
    } 
    finally { setInviting(false); }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity testID="back-caregivers" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Care Team</Text>
        <TouchableOpacity testID="invite-btn" style={s.addBtn} onPress={() => setShowInvite(true)}>
          <Ionicons name="person-add" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={s.infoBanner}>
        <Ionicons name="people" size={20} color={COLORS.secondary} />
        <Text style={s.infoBannerText}>
          Invite family members, PSWs, or other caregivers to help manage care together.
        </Text>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={COLORS.primary} />}>
        <Text style={s.sectionLabel}>Current Caregivers ({caregivers.length})</Text>
        
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.lg }} />
        ) : caregivers.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="people-outline" size={48} color={COLORS.primaryLight} />
            <Text style={s.emptyTitle}>Just you so far</Text>
            <Text style={s.emptyText}>Invite others to help share the caregiving journey</Text>
          </View>
        ) : (
          caregivers.map((c, index) => (
            <View key={c.user_id} style={s.card}>
              <View style={[s.avatar, { backgroundColor: index === 0 ? COLORS.primary : COLORS.secondary }]}>
                <Text style={s.avatarText}>{c.name?.charAt(0)?.toUpperCase()}</Text>
              </View>
              <View style={s.info}>
                <View style={s.nameRow}>
                  <Text style={s.name}>{c.name}</Text>
                  {index === 0 && <View style={s.ownerBadge}><Text style={s.ownerBadgeText}>Owner</Text></View>}
                </View>
                <Text style={s.email}>{c.email}</Text>
              </View>
            </View>
          ))
        )}

        {/* Invite Another Button */}
        <TouchableOpacity style={s.inviteAnotherBtn} onPress={() => setShowInvite(true)}>
          <Ionicons name="mail" size={20} color={COLORS.primary} />
          <Text style={s.inviteAnotherText}>Send Email Invitation</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Invite Modal */}
      <Modal visible={showInvite} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setShowInvite(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={s.modalTitle}>Invite Caregiver</Text>
              <TouchableOpacity testID="send-invite-btn" onPress={handleSendInvite} disabled={inviting}>
                {inviting ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={s.sendText}>Send</Text>}
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalBody} keyboardShouldPersistTaps="handled">
              <View style={s.inviteIcon}>
                <Ionicons name="mail" size={40} color={COLORS.primary} />
              </View>
              <Text style={s.inviteTitle}>Send an Email Invitation</Text>
              <Text style={s.inviteSubtitle}>
                They'll receive an email with instructions to join your care team.
              </Text>

              <View style={s.formGroup}>
                <Text style={s.formLabel}>Email Address *</Text>
                <TextInput 
                  testID="invite-email-input"
                  style={s.formInput} 
                  placeholder="caregiver@example.com" 
                  placeholderTextColor={COLORS.border} 
                  value={email} 
                  onChangeText={setEmail} 
                  keyboardType="email-address" 
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={s.formGroup}>
                <Text style={s.formLabel}>Their Name (optional)</Text>
                <TextInput 
                  testID="invite-name-input"
                  style={s.formInput} 
                  placeholder="e.g., Jane" 
                  placeholderTextColor={COLORS.border} 
                  value={caregiverName} 
                  onChangeText={setCaregiverName} 
                />
              </View>

              <View style={s.formGroup}>
                <Text style={s.formLabel}>Personal Message (optional)</Text>
                <TextInput 
                  testID="invite-message-input"
                  style={[s.formInput, s.textArea]} 
                  placeholder="Add a personal note to your invitation..." 
                  placeholderTextColor={COLORS.border} 
                  value={personalMessage} 
                  onChangeText={setPersonalMessage}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={s.noteBox}>
                <Ionicons name="information-circle" size={18} color={COLORS.info} />
                <Text style={s.noteText}>
                  If they don't have a FamilyCare account yet, the email will include instructions to sign up.
                </Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md 
  },
  title: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.textPrimary },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },

  infoBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.secondary + '15',
    borderRadius: RADIUS.lg, gap: 10,
  },
  infoBannerText: {
    flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.secondary, lineHeight: 20,
  },

  sectionLabel: { 
    fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textSecondary, 
    textTransform: 'uppercase', letterSpacing: 1, 
    paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm, marginTop: SPACING.sm,
  },

  emptyState: { alignItems: 'center', paddingVertical: SPACING.xl },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  emptyText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs },

  card: { 
    flexDirection: 'row', alignItems: 'center', 
    marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, 
    padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  avatar: { 
    width: 48, height: 48, borderRadius: 24, 
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md 
  },
  avatarText: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.white },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  ownerBadge: { 
    backgroundColor: COLORS.primary + '20', 
    paddingHorizontal: SPACING.sm, paddingVertical: 2, 
    borderRadius: RADIUS.full, marginLeft: SPACING.sm,
  },
  ownerBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  email: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },

  inviteAnotherBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: SPACING.lg, marginTop: SPACING.lg, marginBottom: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.primary,
    borderStyle: 'dashed', gap: 8,
  },
  inviteAnotherText: {
    fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.primary,
  },

  // Modal styles
  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, 
    borderBottomWidth: 1, borderBottomColor: COLORS.border 
  },
  modalTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  cancelText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  sendText: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '700' },
  modalBody: { padding: SPACING.lg },

  inviteIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: SPACING.md,
  },
  inviteTitle: {
    fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.textPrimary,
    textAlign: 'center',
  },
  inviteSubtitle: {
    fontSize: FONT_SIZES.sm, color: COLORS.textSecondary,
    textAlign: 'center', marginTop: SPACING.xs, marginBottom: SPACING.xl,
  },

  formGroup: { marginBottom: SPACING.md },
  formLabel: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  formInput: { 
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, 
    borderWidth: 1.5, borderColor: COLORS.border, 
    paddingHorizontal: SPACING.md, height: 48, 
    fontSize: FONT_SIZES.md, color: COLORS.textPrimary 
  },
  textArea: {
    height: 80, paddingTop: SPACING.sm, textAlignVertical: 'top',
  },

  noteBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: SPACING.md,
    backgroundColor: COLORS.info + '10',
    borderRadius: RADIUS.lg, gap: 10, marginTop: SPACING.md,
  },
  noteText: {
    flex: 1, fontSize: FONT_SIZES.xs, color: COLORS.info, lineHeight: 18,
  },
});
