import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../src/constants/theme';

const menuItems = [
  { icon: 'search-circle', label: 'Find Local Support', route: '/find-support', color: '#1ABC9C' },
  { icon: 'chatbubbles', label: 'Care Team Chat', route: '/chat', color: '#27AE60' },
  { icon: 'download', label: 'Export Report', route: '/export-report', color: '#8E44AD' },
  { icon: 'medical', label: 'Doctors & Specialists', route: '/doctors', color: COLORS.primary },
  { icon: 'call', label: 'Emergency Contacts', route: '/emergency-contacts', color: COLORS.error },
  { icon: 'time', label: 'Daily Routine', route: '/daily-routine', color: COLORS.info },
  { icon: 'alert-circle', label: 'Incidents & Falls', route: '/incidents', color: COLORS.warning },
  { icon: 'water', label: 'Bathing Tracker', route: '/bathing-tracker', color: '#9B59B6' },
  { icon: 'calendar', label: 'Appointments', route: '/appointments', color: COLORS.secondary },
  { icon: 'restaurant', label: 'Nutrition & Meals', route: '/nutrition', color: '#E67E22' },
  { icon: 'document-lock', label: 'Legal & Financial', route: '/legal-financial', color: '#2C3E50' },
  { icon: 'people', label: 'Caregivers', route: '/caregivers', color: COLORS.info },
  { icon: 'shield-checkmark', label: 'Privacy & Security', route: '/privacy-security', color: '#1ABC9C' },
  { icon: 'book', label: 'About the Book', route: '/about-book', color: '#D97757' },
];

export default function MoreScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* User info */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>{user?.name?.charAt(0)?.toUpperCase()}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Care Management</Text>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.label}
            testID={`menu-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            style={styles.menuItem}
            onPress={() => router.push(item.route as any)}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
              <Ionicons name={item.icon as any} size={22} color={item.color} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.border} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity testID="logout-menu-btn" style={styles.logoutItem} onPress={logout}>
          <View style={[styles.menuIcon, { backgroundColor: COLORS.error + '15' }]}>
            <Ionicons name="log-out" size={22} color={COLORS.error} />
          </View>
          <Text style={[styles.menuLabel, { color: COLORS.error }]}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  headerTitle: { fontSize: FONT_SIZES.xxl, fontWeight: '800', color: COLORS.textPrimary },
  userCard: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg,
    padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    marginBottom: SPACING.lg, shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 3,
  },
  userAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md,
  },
  userAvatarText: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.white },
  userInfo: { flex: 1 },
  userName: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  userEmail: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  sectionLabel: {
    fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg, marginHorizontal: SPACING.lg, marginBottom: 2,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
  },
  menuIcon: {
    width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md,
  },
  menuLabel: { flex: 1, fontSize: FONT_SIZES.md, fontWeight: '500', color: COLORS.textPrimary },
  logoutItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg, marginHorizontal: SPACING.lg, marginTop: SPACING.lg,
  },
});
