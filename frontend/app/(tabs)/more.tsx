import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../../src/constants/theme';

const menuItems = [
  { icon: 'people', label: 'Care Team', description: 'Invite family & caregivers', route: '/caregivers', color: '#3498DB' },
  { icon: 'search-circle', label: 'Find Local Support', description: 'AI-powered resource finder', route: '/find-support', color: '#1ABC9C' },
  { icon: 'download', label: 'Export Report', description: 'Generate PDF care reports', route: '/export-report', color: '#8E44AD' },
  { icon: 'medical', label: 'Doctors & Specialists', description: 'Manage healthcare team', route: '/doctors', color: COLORS.primary },
  { icon: 'call', label: 'Emergency Contacts', description: 'Quick access contacts', route: '/emergency-contacts', color: COLORS.error },
  { icon: 'shield-checkmark', label: 'Privacy & Data', description: 'Manage your data', route: '/privacy-settings', color: '#27AE60' },
  { icon: 'book', label: 'About the Book', description: 'The Family Care Organizer', route: '/about-book', color: '#D97757' },
];

export default function MoreScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
        <Text style={styles.headerSubtitle}>Settings & Tools</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Premium User Card */}
        <View style={styles.userCardWrapper}>
          <View style={styles.userCardBorder}>
            <View style={styles.userCard}>
              <View style={styles.userAvatarWrapper}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>{user?.name?.charAt(0)?.toUpperCase()}</Text>
                </View>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user?.name}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
                <View style={styles.userBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                  <Text style={styles.userBadgeText}>Primary Caregiver</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Section Label */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLine} />
          <Text style={styles.sectionLabel}>Care Management</Text>
          <View style={styles.sectionLine} />
        </View>

        {/* Premium Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              testID={`menu-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              style={[styles.menuItem, index === menuItems.length - 1 && styles.menuItemLast]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon as any} size={22} color={COLORS.white} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </View>
              <View style={styles.menuChevron}>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button - Premium Style */}
        <TouchableOpacity testID="logout-menu-btn" style={styles.logoutButton} onPress={logout} activeOpacity={0.8}>
          <View style={styles.logoutIconWrapper}>
            <Ionicons name="log-out" size={20} color={COLORS.error} />
          </View>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>Family Care Organizer v1.0</Text>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background,
  },
  header: { 
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
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
  },

  // Premium User Card
  userCardWrapper: {
    marginBottom: SPACING.xl,
    borderRadius: RADIUS.xl + 2,
    ...SHADOWS.lg,
  },
  userCardBorder: {
    padding: 2,
    borderRadius: RADIUS.xl + 2,
    backgroundColor: COLORS.primary,
  },
  userCard: {
    flexDirection: 'row', 
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
  },
  userAvatarWrapper: {
    ...SHADOWS.md,
  },
  userAvatar: {
    width: 56, 
    height: 56, 
    borderRadius: 28,
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  userAvatarText: { 
    fontSize: FONT_SIZES.xl, 
    fontWeight: '800', 
    color: COLORS.white,
  },
  userInfo: { 
    flex: 1, 
    marginLeft: SPACING.lg,
  },
  userName: { 
    fontSize: FONT_SIZES.lg, 
    fontWeight: '700', 
    color: COLORS.textPrimary,
  },
  userEmail: { 
    fontSize: FONT_SIZES.sm, 
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: 4,
  },
  userBadgeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
    fontWeight: '600',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.xs, 
    fontWeight: '700', 
    color: COLORS.textSecondary,
    textTransform: 'uppercase', 
    letterSpacing: 1.5,
    paddingHorizontal: SPACING.md,
  },

  // Premium Menu Items
  menuContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    ...SHADOWS.md,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIconBox: {
    width: 44, 
    height: 44, 
    borderRadius: RADIUS.md,
    justifyContent: 'center', 
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  menuContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  menuLabel: { 
    fontSize: FONT_SIZES.md, 
    fontWeight: '600', 
    color: COLORS.textPrimary,
  },
  menuDescription: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  menuChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Logout Button
  logoutButton: {
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.errorLight,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
  logoutIconWrapper: {
    marginRight: SPACING.sm,
  },
  logoutText: { 
    fontSize: FONT_SIZES.md, 
    fontWeight: '700', 
    color: COLORS.error,
  },

  // Version Text
  versionText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
});
