import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useSubscription } from '../../src/context/SubscriptionContext';
import { api } from '../../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../src/constants/theme';
import { UpgradePrompt } from '../../src/components/UpgradePrompt';

export default function HomeScreen() {
  const { user, logout, selectedRecipientId, setSelectedRecipientId, isProfileOwner, setIsProfileOwner } = useAuth();
  const { isSubscribed } = useSubscription();
  const router = useRouter();
  const [recipients, setRecipients] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const recs = await api.get('/care-recipients');
      setRecipients(recs);
      if (recs.length > 0) {
        // Handle both id formats from backend
        const firstRecId = recs[0].recipient_id || recs[0].id;
        const activeId = selectedRecipientId || firstRecId;
        if (!selectedRecipientId) setSelectedRecipientId(activeId);
        const dash = await api.get(`/dashboard/${activeId}`);
        setDashboard(dash);
        
        // Check if user is owner of any recipient (created_by matches user_id)
        const isOwner = recs.some((r: any) => r.created_by === user?.user_id);
        setIsProfileOwner(isOwner);
      } else {
        // No recipients - user is not an owner yet (new user)
        setIsProfileOwner(true); // Allow new users to create their first profile
      }
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRecipientId, user?.user_id, setIsProfileOwner]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const activeRecipient = recipients.find(r => (r.recipient_id || r.id) === selectedRecipientId);

  // Handler for when invited users try to add a recipient
  const handleAddRecipient = () => {
    // If user is not a profile owner (invited user) and not subscribed, show upgrade prompt
    if (!isProfileOwner && !isSubscribed) {
      setShowUpgradePrompt(true);
    } else {
      router.push('/add-recipient');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // No recipients - onboarding state
  if (recipients.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name?.split(' ')[0]}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="people-outline" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>No care recipients yet</Text>
          <Text style={styles.emptyText}>Add someone you're caring for to get started</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddRecipient}>
            <Ionicons name="add" size={20} color={COLORS.white} />
            <Text style={styles.addButtonText}>Add Care Recipient</Text>
          </TouchableOpacity>
        </View>
        
        {/* Upgrade Prompt for invited users */}
        <UpgradePrompt 
          visible={showUpgradePrompt} 
          onClose={() => setShowUpgradePrompt(false)} 
          feature="recipients" 
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good {getTimeOfDay()},</Text>
            <Text style={styles.userName}>{user?.name?.split(' ')[0]}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Care Recipient Selector */}
        {recipients.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recipientScroll}>
            {recipients.map(r => (
              <TouchableOpacity
                key={r.recipient_id}
                style={[styles.recipientChip, selectedRecipientId === r.recipient_id && styles.recipientChipActive]}
                onPress={() => { setSelectedRecipientId(r.recipient_id); loadData(); }}
              >
                <View style={[styles.recipientAvatar, selectedRecipientId === r.recipient_id && styles.recipientAvatarActive]}>
                  <Text style={styles.recipientInitial}>{r.name?.charAt(0)}</Text>
                </View>
                <Text style={[styles.recipientName, selectedRecipientId === r.recipient_id && styles.recipientNameActive]}>
                  {r.name?.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addRecipientChip} onPress={() => router.push('/add-recipient')}>
              <Ionicons name="add" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Active Recipient Card */}
        {activeRecipient && (
          <TouchableOpacity style={styles.profileCard} onPress={() => router.push('/(tabs)/profile')}>
            <View style={styles.profileHeader}>
              {activeRecipient.profile_picture ? (
                <Image source={{ uri: activeRecipient.profile_picture }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileInitial}>{activeRecipient.name?.charAt(0)}</Text>
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{activeRecipient.name}</Text>
                {activeRecipient.date_of_birth && (
                  <Text style={styles.profileAge}>
                    {calculateAge(activeRecipient.date_of_birth)} years old
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
            </View>
            {activeRecipient.notes && (
              <Text style={styles.profileNotes} numberOfLines={2}>{activeRecipient.notes}</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Quick Actions - 3D Button Style Grid */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity 
            style={[styles.quickAction, styles.quickAction3D, { backgroundColor: COLORS.primaryLight }]} 
            onPress={() => router.push('/(tabs)/medications-tab')}
            activeOpacity={0.8}
          >
            <View style={styles.quickActionHighlight} />
            <View style={[styles.quickActionIcon, styles.quickActionIcon3D, { backgroundColor: COLORS.primary }]}>
              <Ionicons name="medical" size={22} color={COLORS.white} />
            </View>
            <Text style={styles.quickActionLabel}>Medications</Text>
            <Text style={styles.quickActionCount}>{dashboard?.stats?.medications || 0} active</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickAction, styles.quickAction3D, { backgroundColor: COLORS.secondaryLight }]} 
            onPress={() => router.push('/appointments')}
            activeOpacity={0.8}
          >
            <View style={styles.quickActionHighlight} />
            <View style={[styles.quickActionIcon, styles.quickActionIcon3D, { backgroundColor: COLORS.secondary }]}>
              <Ionicons name="calendar" size={22} color={COLORS.white} />
            </View>
            <Text style={styles.quickActionLabel}>Appointments</Text>
            <Text style={styles.quickActionCount}>{dashboard?.upcoming_appointments?.length || 0} upcoming</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickAction, styles.quickAction3D, { backgroundColor: COLORS.infoLight }]} 
            onPress={() => router.push('/(tabs)/notes-tab')}
            activeOpacity={0.8}
          >
            <View style={styles.quickActionHighlight} />
            <View style={[styles.quickActionIcon, styles.quickActionIcon3D, { backgroundColor: COLORS.info }]}>
              <Ionicons name="document-text" size={22} color={COLORS.white} />
            </View>
            <Text style={styles.quickActionLabel}>Notes</Text>
            <Text style={styles.quickActionCount}>{dashboard?.stats?.notes || 0} total</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickAction, styles.quickAction3D, { backgroundColor: COLORS.errorLight }]} 
            onPress={() => router.push('/emergency-contacts')}
            activeOpacity={0.8}
          >
            <View style={styles.quickActionHighlight} />
            <View style={[styles.quickActionIcon, styles.quickActionIcon3D, { backgroundColor: COLORS.error }]}>
              <Ionicons name="call" size={22} color={COLORS.white} />
            </View>
            <Text style={styles.quickActionLabel}>Emergency</Text>
            <Text style={styles.quickActionCount}>Contacts</Text>
          </TouchableOpacity>
        </View>

        {/* Health Summary Cards - MyChart Style */}
        <Text style={styles.sectionTitle}>Health Summary</Text>
        
        {/* Upcoming Appointment Card */}
        {dashboard?.upcoming_appointments?.length > 0 ? (
          <TouchableOpacity style={styles.summaryCard} onPress={() => router.push('/(tabs)/appointments-tab')}>
            <View style={styles.summaryHeader}>
              <View style={[styles.summaryIcon, { backgroundColor: COLORS.secondaryLight }]}>
                <Ionicons name="calendar" size={20} color={COLORS.secondary} />
              </View>
              <View style={styles.summaryTitleContainer}>
                <Text style={styles.summaryTitle}>Next Appointment</Text>
                <Text style={styles.summarySubtitle}>{dashboard.upcoming_appointments[0].title}</Text>
              </View>
            </View>
            <View style={styles.summaryContent}>
              <View style={styles.summaryRow}>
                <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.summaryText}>
                  {formatDate(dashboard.upcoming_appointments[0].date)} at {dashboard.upcoming_appointments[0].time || 'TBD'}
                </Text>
              </View>
              {dashboard.upcoming_appointments[0].location && (
                <View style={styles.summaryRow}>
                  <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.summaryText}>{dashboard.upcoming_appointments[0].location}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.noDataCard}>
            <Ionicons name="calendar-outline" size={24} color={COLORS.textMuted} />
            <Text style={styles.noDataText}>No upcoming appointments</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/appointments-tab')}>
              <Text style={styles.noDataLink}>Schedule one</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Medications Card */}
        <TouchableOpacity style={styles.summaryCard} onPress={() => router.push('/(tabs)/medications-tab')}>
          <View style={styles.summaryHeader}>
            <View style={[styles.summaryIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="medical" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.summaryTitleContainer}>
              <Text style={styles.summaryTitle}>Medications</Text>
              <Text style={styles.summarySubtitle}>{dashboard?.stats?.medications || 0} active medications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </View>
        </TouchableOpacity>

        {/* Doctors Card */}
        <TouchableOpacity style={styles.summaryCard} onPress={() => router.push('/doctors')}>
          <View style={styles.summaryHeader}>
            <View style={[styles.summaryIcon, { backgroundColor: COLORS.infoLight }]}>
              <Ionicons name="person" size={20} color={COLORS.info} />
            </View>
            <View style={styles.summaryTitleContainer}>
              <Text style={styles.summaryTitle}>Care Team</Text>
              <Text style={styles.summarySubtitle}>Doctors & specialists</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </View>
        </TouchableOpacity>

        {/* Recent Activity */}
        {dashboard?.recent_notes?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity style={styles.activityCard} onPress={() => router.push('/(tabs)/notes-tab')}>
              <View style={styles.activityIcon}>
                <Ionicons name="document-text" size={18} color={COLORS.info} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>{dashboard.recent_notes.length} recent notes</Text>
                <Text style={styles.activityTime}>Tap to view all notes</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: SPACING.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper functions
function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function calculateAge(dateOfBirth: string) {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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
  greeting: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  userName: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  logoutBtn: {
    padding: SPACING.sm,
  },

  // Recipient Selector
  recipientScroll: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  recipientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginRight: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  recipientChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  recipientAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  recipientAvatarActive: {
    backgroundColor: COLORS.primary,
  },
  recipientInitial: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.white,
  },
  recipientName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  recipientNameActive: {
    color: COLORS.primary,
  },
  addRecipientChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Profile Card
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.white,
  },
  profileInfo: {
    flex: 1,
    marginLeft: SPACING.lg,
  },
  profileName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  profileAge: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  profileNotes: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    lineHeight: 20,
  },

  // Section Title
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
    marginTop: SPACING.md,
  },

  // Quick Actions Grid
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  quickAction: {
    width: '47%',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  // 3D Button Effects
  quickAction3D: {
    // Bottom shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    // Inner border for 3D effect
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderBottomColor: 'rgba(0,0,0,0.1)',
    borderRightColor: 'rgba(0,0,0,0.05)',
  },
  quickActionHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  quickActionIcon3D: {
    // Icon 3D effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
    borderLeftColor: 'rgba(255,255,255,0.2)',
    borderBottomColor: 'rgba(0,0,0,0.2)',
    borderRightColor: 'rgba(0,0,0,0.1)',
  },
  quickActionLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  quickActionCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Summary Cards
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryTitleContainer: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  summaryTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  summarySubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  summaryContent: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  summaryText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },

  // No Data Card
  noDataCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  noDataText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginLeft: SPACING.md,
  },
  noDataLink: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Activity Card
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.infoLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  activityText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  activityTime: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
    gap: SPACING.sm,
  },
  addButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
});
