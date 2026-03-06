import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Alert, RefreshControl } from 'react-native';
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
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const load = useCallback(async () => {
    if (!selectedRecipientId) { setLoading(false); return; }
    try { setCaregivers(await api.get(`/care-recipients/${selectedRecipientId}/caregivers`)); } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [selectedRecipientId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const handleInvite = async () => {
    if (!email.trim()) { Alert.alert('Required', 'Enter email'); return; }
    setInviting(true);
    try { const res = await api.post(`/care-recipients/${selectedRecipientId}/invite`, { email: email.trim() }); Alert.alert('Success', res.message); setEmail(''); await load(); }
    catch (e: any) { Alert.alert('Error', e.message); } finally { setInviting(false); }
  };
  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}><TouchableOpacity testID="back-caregivers" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity><Text style={s.title}>Caregivers</Text><View style={{ width: 24 }} /></View>
      <View style={s.inviteSection}>
        <Text style={s.inviteLabel}>Invite a caregiver by email</Text>
        <View style={s.inviteRow}>
          <TextInput testID="invite-email" style={s.inviteInput} placeholder="caregiver@email.com" placeholderTextColor={COLORS.border} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TouchableOpacity testID="invite-btn" style={s.inviteBtn} onPress={handleInvite} disabled={inviting}>
            {inviting ? <ActivityIndicator size="small" color={COLORS.white} /> : <Ionicons name="send" size={18} color={COLORS.white} />}
          </TouchableOpacity>
        </View>
        <Text style={s.inviteNote}>They must have a FamilyCare account first</Text>
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={COLORS.primary} />}>
        <Text style={s.sectionLabel}>Current Caregivers</Text>
        {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.lg }} /> :
          caregivers.map(c => (<View key={c.user_id} style={s.card}><View style={s.avatar}><Text style={s.avatarText}>{c.name?.charAt(0)?.toUpperCase()}</Text></View>
            <View style={s.info}><Text style={s.name}>{c.name}</Text><Text style={s.email}>{c.email}</Text></View></View>))}
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md }, title: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.textPrimary },
  inviteSection: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  inviteLabel: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  inviteRow: { flexDirection: 'row', alignItems: 'center' },
  inviteInput: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: SPACING.md, height: 48, fontSize: FONT_SIZES.md, color: COLORS.textPrimary, marginRight: SPACING.sm },
  inviteBtn: { width: 48, height: 48, borderRadius: RADIUS.lg, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  inviteNote: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 4 },
  sectionLabel: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  card: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  avatarText: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.white },
  info: { flex: 1 }, name: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary }, email: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
});
