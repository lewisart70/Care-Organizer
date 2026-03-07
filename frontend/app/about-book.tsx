import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';

const AMAZON_LINK = 'https://www.amazon.com/s?k=The+Family+Care+Organizer+Sarah+Lewis';

export default function AboutBookScreen() {
  const router = useRouter();

  const openAmazon = async () => {
    try {
      const canOpen = await Linking.canOpenURL(AMAZON_LINK);
      if (canOpen) {
        await Linking.openURL(AMAZON_LINK);
      } else {
        Alert.alert('Unable to Open', 'Could not open the Amazon link. Please search for "The Family Care Organizer by Sarah Lewis" on Amazon.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open the link.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity testID="back-book" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About the Book</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Book Cover */}
        <View style={styles.coverContainer}>
          <Image 
            source={require('../assets/images/book-cover.png')}
            style={styles.bookCover}
            resizeMode="contain"
          />
        </View>

        {/* Book Title */}
        <Text style={styles.bookTitle}>The Family Care Organizer</Text>
        <Text style={styles.bookSubtitle}>
          A Compassionate Guide to Organizing, Planning, and Caring for Your Aging Loved One
        </Text>

        {/* Author */}
        <View style={styles.authorSection}>
          <Text style={styles.authorLabel}>Written by</Text>
          <Text style={styles.authorName}>Sarah Lewis</Text>
        </View>

        {/* Buy Button */}
        <TouchableOpacity style={styles.buyButton} onPress={openAmazon}>
          <Ionicons name="cart" size={20} color={COLORS.white} />
          <Text style={styles.buyButtonText}>Buy on Amazon</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider} />

        {/* About the Book */}
        <Text style={styles.sectionTitle}>About the Book</Text>
        <Text style={styles.description}>
          Caring for an aging parent or loved one is one of the most meaningful and challenging journeys a family can take. Whether you are a family caregiver, a personal support worker, or part of a healthcare team, having the right tools and information at your fingertips can make all the difference.
        </Text>
        <Text style={styles.description}>
          The Family Care Organizer was created out of a real caregiving journey — a daughter's decision to move her family into her parents' home and navigate the beautiful, complex reality of multigenerational care. Born from lived experience, this practical binder-style guide brings together everything a caregiver needs in one organized, easy-to-use resource.
        </Text>

        {/* What's Inside */}
        <Text style={styles.sectionTitle}>Inside You'll Find</Text>
        <View style={styles.featureList}>
          {[
            'Essential record-keeping forms for medical information, medications, doctor contacts, and daily routines',
            'Tracking tools for bathing, hygiene, fall incidents, and caregiver observations',
            'Educational guidance on dementia, senior nutrition, fall prevention, home accessibility, and common health conditions',
            'Senior-friendly recipes and a safe exercise guide',
            'Emergency planning tools and legal and financial checklists',
            'A perpetual calendar for appointments and important dates',
            'A curated product resource guide featuring helpful tools and equipment',
          ].map((item, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.secondary} />
              <Text style={styles.featureText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Quote */}
        <View style={styles.quoteBox}>
          <Ionicons name="heart" size={24} color={COLORS.primary} />
          <Text style={styles.quoteText}>
            "Written with both compassion and practicality, The Family Care Organizer meets caregivers exactly where they are — providing structure on the hard days and reassurance on all the rest."
          </Text>
          <Text style={styles.quoteFooter}>
            You don't have to have everything figured out. This binder grows with you.
          </Text>
        </View>

        {/* About the Author */}
        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>About the Author</Text>
        <Text style={styles.description}>
          Sarah Lewis created The Family Care Organizer while navigating the real-life challenges of caring for aging parents. Through this experience, she developed a practical system to help families organize essential information and bring greater clarity and calm to the caregiving journey.
        </Text>

        {/* App Connection */}
        <View style={styles.appConnection}>
          <Ionicons name="phone-portrait" size={24} color={COLORS.primary} />
          <Text style={styles.appConnectionText}>
            This app is the digital companion to the book, bringing the same organizational system to your fingertips.
          </Text>
        </View>

        {/* Second Buy Button */}
        <TouchableOpacity style={styles.buyButton} onPress={openAmazon}>
          <Ionicons name="cart" size={20} color={COLORS.white} />
          <Text style={styles.buyButtonText}>Get Your Copy on Amazon</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: SPACING.lg, 
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  content: { flex: 1, paddingHorizontal: SPACING.lg },
  
  coverContainer: {
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  bookCover: {
    width: 280,
    height: 200,
    borderRadius: RADIUS.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  
  bookTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  bookSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.md,
  },
  
  authorSection: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  authorLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  authorName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
    marginTop: SPACING.lg,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  buyButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xl,
  },
  
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  description: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: SPACING.md,
  },
  
  featureList: {
    marginBottom: SPACING.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    gap: 10,
  },
  featureText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  
  quoteBox: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  quoteText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    fontStyle: 'italic',
    lineHeight: 22,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  quoteFooter: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  
  appConnection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  appConnectionText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
