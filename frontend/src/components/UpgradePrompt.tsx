import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription, FREE_LIMITS } from '../context/SubscriptionContext';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../constants/theme';

interface UpgradePromptProps {
  visible: boolean;
  onClose: () => void;
  feature: 'ai' | 'pdf' | 'recipients' | 'invites';
  currentUsage?: number;
}

const FEATURE_INFO = {
  ai: {
    title: 'AI Query Limit Reached',
    description: `You've used your free AI query this month.`,
    icon: 'search',
  },
  pdf: {
    title: 'PDF Export Limit Reached',
    description: `You've used your free PDF export this month.`,
    icon: 'document-text',
  },
  recipients: {
    title: 'Care Recipient Limit',
    description: `Free accounts are limited to ${FREE_LIMITS.careRecipients} care recipient.`,
    icon: 'people',
  },
  invites: {
    title: 'Invite Limit Reached',
    description: `Free accounts can invite ${FREE_LIMITS.careTeamInvites} team member.`,
    icon: 'person-add',
  },
};

export function UpgradePrompt({ visible, onClose, feature, currentUsage }: UpgradePromptProps) {
  const router = useRouter();
  const info = FEATURE_INFO[feature];

  const handleUpgrade = () => {
    onClose();
    router.push('/paywall');
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Ionicons name={info.icon as any} size={40} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>{info.title}</Text>
          <Text style={styles.description}>{info.description}</Text>

          <View style={styles.benefitsList}>
            <View style={styles.benefit}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.benefitText}>Unlimited access to all features</Text>
            </View>
            <View style={styles.benefit}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.benefitText}>14-day free trial</Text>
            </View>
            <View style={styles.benefit}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.benefitText}>Cancel anytime</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade} activeOpacity={0.8}>
            <Ionicons name="star" size={20} color={COLORS.white} />
            <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.laterButton} onPress={onClose}>
            <Text style={styles.laterButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modal: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  benefitsList: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  benefitText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    width: '100%',
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  upgradeButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.white,
  },
  laterButton: {
    paddingVertical: SPACING.md,
  },
  laterButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
});
