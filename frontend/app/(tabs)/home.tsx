import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../src/constants/theme';
import { LogoSimple } from '../../src/components/Logo';

export default function HomeScreen() {
  const { user, logout, selectedRecipientId, setSelectedRecipientId } = useAuth();
  const router = useRouter();
  const [recipients, setRecipients] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const recs = await api.get('/care-recipients');
      setRecipients(recs);
      if (recs.length > 0) {
        const activeId = selectedRecipientId || recs[0].recipient_id;
        if (!selectedRecipientId) setSelectedRecipientId(activeId);
        const dash = await api.get(`/dashboard/${activeId}`);
        setDashboard(dash);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRecipientId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const loadReminders = async () => {
    if (!selectedRecipientId) return;
    setLoadingReminders(true);
    try {
      const res = await api.post('/ai/smart-reminders', { recipient_id: selectedRecipientId });
      setReminders(res.reminders || []);
    } catch {
      setReminders([]);
    } finally {
      setLoadingReminders(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const quickActions = [
    { icon: 'medkit', label: 'Meds', color: COLORS.primary, route: '/medications' },
    { icon: 'call', label: 'Emergency', color: COLORS.error, route: '/emergency-contacts' },
    { icon: 'calendar', label: 'Appts', color: COLORS.info, route: '/appointments' },
    { icon: 'document-text', label: 'Notes', color: COLORS.secondary, route: '/(tabs)/notes-tab' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]}</Text>
            <Text style={styles.subGreeting}>Here's today's care overview</Text>
          </View>
          <TouchableOpacity testID="logout-btn" style={styles.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* No recipients */}
        {recipients.length === 0 ? (
          <View style={styles.emptyCard}>
            <LogoSimple size={64} />
            <Text style={styles.emptyTitle}>Welcome to FamilyCare!</Text>
            <Text style={styles.emptyText}>Start by adding a care recipient — the person you're caring for.</Text>
            <TouchableOpacity
              testID="add-first-recipient-btn"
              style={styles.addBtn}
              onPress={() => router.push('/add-recipient')}
            >
              <Ionicons name="add" size={20} color={COLORS.white} />
              <Text style={styles.addBtnText}>Add Care Recipient</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Recipient selector with profile photos */}
            {recipients.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recipientScroll}>
                {recipients.map((r: any) => (
                  <TouchableOpacity
                    key={r.recipient_id}
                    testID={`recipient-${r.recipient_id}`}
                    style={[styles.recipientChipWithPhoto, selectedRecipientId === r.recipient_id && styles.recipientChipActive]}
                    onPress={async () => {
                      setSelectedRecipientId(r.recipient_id);
                      const dash = await api.get(`/dashboard/${r.recipient_id}`);
                      setDashboard(dash);
                    }}
                  >
                    {r.profile_photo ? (
                      <Image source={{ uri: r.profile_photo }} style={styles.recipientThumb} />
                    ) : (
                      <View style={styles.recipientThumbPlaceholder}>
                        <Ionicons name="person" size={16} color={COLORS.textSecondary} />
                      </View>
                    )}
                    <Text style={[styles.recipientChipText, selectedRecipientId === r.recipient_id && styles.recipientChipTextActive]}>
                      {r.name.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  testID="add-recipient-chip"
                  style={styles.addRecipientChip}
                  onPress={() => router.push('/add-recipient')}
                >
                  <Ionicons name="add" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* Single Recipient Card with Photo (when only one recipient) */}
            {recipients.length === 1 && (
              <View style={styles.singleRecipientCard}>
                <TouchableOpacity 
                  style={styles.recipientPhotoLarge}
                  onPress={() => router.push('/edit-profile')}
                >
                  {recipients[0].profile_photo ? (
                    <Image source={{ uri: recipients[0].profile_photo }} style={styles.recipientPhotoLargeImg} />
                  ) : (
                    <View style={styles.recipientPhotoLargePlaceholder}>
                      <Ionicons name="person" size={32} color={COLORS.textSecondary} />
                    </View>
                  )}
                  <View style={styles.editBadgeSmall}>
                    <Ionicons name="camera" size={10} color={COLORS.white} />
                  </View>
                </TouchableOpacity>
                <View style={styles.singleRecipientInfo}>
                  <Text style={styles.singleRecipientName}>{recipients[0].name}</Text>
                  {recipients[0].date_of_birth && (
                    <Text style={styles.singleRecipientDob}>DOB: {recipients[0].date_of_birth}</Text>
                  )}
                </View>
                <TouchableOpacity
                  testID="add-another-recipient"
                  style={styles.addAnotherBtn}
                  onPress={() => router.push('/add-recipient')}
                >
                  <Ionicons name="add" size={16} color={COLORS.primary} />
                  <Text style={styles.addAnotherText}>Add Another</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Stats Cards */}
            {dashboard && (
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: '#FFF5F0' }]}>
                  <Ionicons name="medkit" size={24} color={COLORS.primary} />
                  <Text style={styles.statNum}>{dashboard.stats.medications}</Text>
                  <Text style={styles.statLabel}>Medications</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#F0F7F4' }]}>
                  <Ionicons name="calendar" size={24} color={COLORS.secondary} />
                  <Text style={styles.statNum}>{dashboard.stats.appointments}</Text>
                  <Text style={styles.statLabel}>Appointments</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#FFF9EB' }]}>
                  <Ionicons name="document-text" size={24} color={COLORS.warning} />
                  <Text style={styles.statNum}>{dashboard.stats.notes}</Text>
                  <Text style={styles.statLabel}>Notes</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#F0F4FF' }]}>
                  <Ionicons name="people" size={24} color={COLORS.info} />
                  <Text style={styles.statNum}>{dashboard.stats.caregivers}</Text>
                  <Text style={styles.statLabel}>Caregivers</Text>
                </View>
              </View>
            )}

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsRow}>
              {quickActions.map((a) => (
                <TouchableOpacity
                  key={a.label}
                  testID={`quick-action-${a.label.toLowerCase()}`}
                  style={styles.actionBtn}
                  onPress={() => router.push(a.route as any)}
                >
                  <View style={[styles.actionIcon, { backgroundColor: a.color + '15' }]}>
                    <Ionicons name={a.icon as any} size={24} color={a.color} />
                  </View>
                  <Text style={styles.actionLabel}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* AI Smart Reminders */}
            <View style={styles.reminderSection}>
              <View style={styles.reminderHeader}>
                <Text style={styles.sectionTitle}>Smart Reminders</Text>
                <TouchableOpacity testID="refresh-reminders-btn" onPress={loadReminders} style={styles.aiBtn}>
                  <Ionicons name="sparkles" size={16} color={COLORS.white} />
                  <Text style={styles.aiBtnText}>Generate</Text>
                </TouchableOpacity>
              </View>
              {loadingReminders ? (
                <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.lg }} />
              ) : reminders.length > 0 ? (
                reminders.slice(0, 4).map((r: any, i: number) => (
                  <View key={i} style={styles.reminderCard}>
                    <View style={[styles.reminderDot, {
                      backgroundColor: r.priority === 'high' ? COLORS.error : r.priority === 'medium' ? COLORS.warning : COLORS.success
                    }]} />
                    <View style={styles.reminderContent}>
                      <Text style={styles.reminderTitle}>{r.title}</Text>
                      <Text style={styles.reminderDesc}>{r.description}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.reminderEmpty}>
                  <Ionicons name="sparkles" size={24} color={COLORS.primaryLight} />
                  <Text style={styles.reminderEmptyText}>Tap "Generate" for AI-powered care reminders</Text>
                </View>
              )}
            </View>

            {/* Upcoming Appointments */}
            {dashboard?.upcoming_appointments?.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
                {dashboard.upcoming_appointments.map((a: any) => (
                  <View key={a.appointment_id} style={styles.apptCard}>
                    <View style={styles.apptDate}>
                      <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                      <Text style={styles.apptDateText}>{a.date}</Text>
                    </View>
                    <Text style={styles.apptTitle}>{a.title}</Text>
                    {a.doctor_name ? <Text style={styles.apptDoctor}>Dr. {a.doctor_name}</Text> : null}
                  </View>
                ))}
              </View>
            )}

            {/* Recent Notes */}
            {dashboard?.recent_notes?.length > 0 && (
              <View style={{ marginBottom: SPACING.xl }}>
                <Text style={styles.sectionTitle}>Recent Notes</Text>
                {dashboard.recent_notes.map((n: any) => (
                  <View key={n.note_id} style={styles.noteCard}>
                    <Text style={styles.noteContent} numberOfLines={2}>{n.content}</Text>
                    <Text style={styles.noteAuthor}>— {n.author_name}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Book Promotion Banner */}
            <TouchableOpacity 
              style={styles.bookBanner}
              onPress={() => router.push('/about-book')}
            >
              <Image 
                source={require('../../assets/images/book-cover.png')}
                style={styles.bookBannerImage}
                resizeMode="cover"
              />
              <View style={styles.bookBannerContent}>
                <Text style={styles.bookBannerLabel}>COMPANION BOOK</Text>
                <Text style={styles.bookBannerTitle}>The Family Care Organizer</Text>
                <Text style={styles.bookBannerAuthor}>by Sarah Lewis</Text>
                <View style={styles.bookBannerCta}>
                  <Text style={styles.bookBannerCtaText}>Learn More</Text>
                  <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
                </View>
              </View>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.md,
  },
  greeting: { fontSize: FONT_SIZES.xxl, fontWeight: '800', color: COLORS.textPrimary },
  subGreeting: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  logoutBtn: { padding: SPACING.sm },
  emptyCard: {
    margin: SPACING.lg, padding: SPACING.xl, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl, alignItems: 'center',
    shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 3,
  },
  emptyIconCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primaryLight + '30',
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md,
  },
  emptyTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  emptyText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full, paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  addBtnText: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '700', marginLeft: SPACING.sm },
  recipientScroll: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  recipientChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, marginRight: SPACING.sm,
  },
  recipientChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  recipientChipText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textSecondary },
  recipientChipTextActive: { color: COLORS.white },
  addRecipientChip: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: COLORS.primary,
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.lg,
    justifyContent: 'space-between', marginBottom: SPACING.md,
  },
  statCard: {
    width: '48%', padding: SPACING.md, borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm, alignItems: 'center',
  },
  statNum: { fontSize: FONT_SIZES.xxl, fontWeight: '800', color: COLORS.textPrimary, marginTop: SPACING.xs },
  statLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  sectionTitle: {
    fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary,
    paddingHorizontal: SPACING.lg, marginTop: SPACING.md, marginBottom: SPACING.sm,
  },
  actionsRow: {
    flexDirection: 'row', paddingHorizontal: SPACING.md,
    justifyContent: 'space-between', marginBottom: SPACING.md,
  },
  actionBtn: { alignItems: 'center', width: '24%' },
  actionIcon: {
    width: 52, height: 52, borderRadius: RADIUS.lg,
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.xs,
  },
  actionLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'center' },
  reminderSection: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  reminderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.full, paddingVertical: SPACING.xs, paddingHorizontal: SPACING.md,
  },
  aiBtnText: { color: COLORS.white, fontSize: FONT_SIZES.xs, fontWeight: '700', marginLeft: 4 },
  reminderCard: {
    flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginTop: SPACING.sm, alignItems: 'flex-start',
    shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  reminderDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, marginRight: SPACING.sm },
  reminderContent: { flex: 1 },
  reminderTitle: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary },
  reminderDesc: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2, lineHeight: 18 },
  reminderEmpty: {
    alignItems: 'center', paddingVertical: SPACING.lg,
    backgroundColor: COLORS.primaryLight + '10', borderRadius: RADIUS.lg, marginTop: SPACING.sm,
  },
  reminderEmptyText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.sm },
  apptCard: {
    marginHorizontal: SPACING.lg, padding: SPACING.md, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, marginBottom: SPACING.sm, borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  apptDate: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  apptDateText: { fontSize: FONT_SIZES.xs, color: COLORS.primary, fontWeight: '600', marginLeft: 4 },
  apptTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  apptDoctor: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  noteCard: {
    marginHorizontal: SPACING.lg, padding: SPACING.md, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, marginBottom: SPACING.sm,
  },
  noteContent: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, lineHeight: 20 },
  noteAuthor: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 4, fontStyle: 'italic' },
  
  // Profile photo styles for recipient selector
  recipientChipWithPhoto: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, marginRight: SPACING.sm,
  },
  recipientThumb: {
    width: 28, height: 28, borderRadius: 14,
  },
  recipientThumbPlaceholder: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.primaryLight + '30',
    justifyContent: 'center', alignItems: 'center',
  },
  
  // Single recipient card with large photo
  singleRecipientCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
    padding: SPACING.md, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 6, elevation: 3,
  },
  recipientPhotoLarge: {
    position: 'relative',
  },
  recipientPhotoLargeImg: {
    width: 56, height: 56, borderRadius: 28,
  },
  recipientPhotoLargePlaceholder: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primaryLight + '30',
    justifyContent: 'center', alignItems: 'center',
  },
  editBadgeSmall: {
    position: 'absolute', bottom: 0, right: 0,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.surface,
  },
  singleRecipientInfo: {
    flex: 1, marginLeft: SPACING.md,
  },
  singleRecipientName: {
    fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary,
  },
  singleRecipientDob: {
    fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2,
  },
  addAnotherBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.primary,
  },
  addAnotherText: {
    fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.primary,
  },
  
  // Book promotion banner styles
  bookBanner: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  bookBannerImage: {
    width: 70,
    height: 90,
    borderRadius: RADIUS.md,
  },
  bookBannerContent: {
    flex: 1,
    marginLeft: SPACING.md,
    justifyContent: 'center',
  },
  bookBannerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  bookBannerTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  bookBannerAuthor: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  bookBannerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: 4,
  },
  bookBannerCtaText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
