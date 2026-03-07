import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, ScrollView, 
  ActivityIndicator, TextInput, Alert, RefreshControl, Linking, Modal 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';

interface Resource {
  resource_id?: string;
  name: string;
  description: string;
  category: string;
  website?: string;
  phone?: string;
  address?: string;
  email?: string;
  notes?: string;
  location_searched?: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  home_care: '#27AE60',
  government_programs: '#2980B9',
  dementia_support: '#E74C3C',
  mental_health: '#9B59B6',
  legal_financial: '#2C3E50',
  medical_equipment: '#E67E22',
};

export default function FindSupportScreen() {
  const router = useRouter();
  const { token } = useAuth();
  
  // State
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [location, setLocation] = useState('');
  const [specificQuery, setSpecificQuery] = useState('');
  const [resources, setResources] = useState<Resource[]>([]);
  const [essentialResources, setEssentialResources] = useState<Resource[]>([]);
  const [savedResources, setSavedResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showSaved, setShowSaved] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load saved resources when tab is focused
  useFocusEffect(
    useCallback(() => {
      loadSavedResources();
    }, [])
  );

  const loadCategories = async () => {
    try {
      const result = await api.get('/resources/categories');
      setCategories(result.categories || []);
    } catch (e) {
      console.error('Failed to load categories:', e);
      // Fallback categories
      setCategories([
        { id: 'home_care', name: 'Home Care Services', icon: 'home', description: 'PSW agencies, nursing care' },
        { id: 'government_programs', name: 'Government Programs', icon: 'business', description: 'Healthcare subsidies' },
        { id: 'dementia_support', name: 'Dementia & Alzheimer\'s', icon: 'heart', description: 'Support groups, clinics' },
        { id: 'mental_health', name: 'Caregiver Mental Health', icon: 'happy', description: 'Counseling, support' },
        { id: 'legal_financial', name: 'Legal & Financial', icon: 'document-text', description: 'Elder law, advisors' },
        { id: 'medical_equipment', name: 'Medical Equipment', icon: 'medkit', description: 'Mobility aids' },
      ]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadSavedResources = async () => {
    try {
      const result = await api.get('/resources/saved');
      setSavedResources(result || []);
    } catch (e) {
      console.error('Failed to load saved resources:', e);
    }
  };

  const searchResources = async () => {
    if (!location.trim()) {
      Alert.alert('Location Required', 'Please enter your city, province/state, and country to search for local resources.');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Category Required', 'Please select a resource category to search.');
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const result = await api.post('/resources/search', {
        location: location.trim(),
        category: selectedCategory,
        specific_query: specificQuery.trim() || null,
      });
      
      setResources(result.resources || []);
      setEssentialResources(result.essential_resources || []);
      
      if ((result.resources?.length || 0) === 0 && (result.essential_resources?.length || 0) === 0) {
        Alert.alert('No Results', 'No resources found for this search. Try adjusting your location or category.');
      }
    } catch (e: any) {
      console.error('Search error:', e);
      Alert.alert('Search Failed', e.message || 'Failed to search for resources. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveResource = async (resource: Resource) => {
    try {
      await api.post('/resources/saved', {
        ...resource,
        location_searched: location,
      });
      Alert.alert('Saved!', 'Resource has been bookmarked.');
      loadSavedResources();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save resource');
    }
  };

  const removeSavedResource = async (resourceId: string) => {
    Alert.alert(
      'Remove Resource',
      'Are you sure you want to remove this bookmark?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.del(`/resources/saved/${resourceId}`);
              loadSavedResources();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const openLink = (url: string) => {
    if (url) {
      Linking.openURL(url.startsWith('http') ? url : `https://${url}`);
    }
  };

  const callPhone = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`);
    }
  };

  const sendEmail = (email: string) => {
    if (email) {
      Linking.openURL(`mailto:${email}`);
    }
  };

  const renderResourceCard = (resource: Resource, isSaved: boolean = false) => {
    const categoryColor = CATEGORY_COLORS[resource.category] || COLORS.primary;
    const isAlreadySaved = savedResources.some(sr => sr.name === resource.name && sr.phone === resource.phone);

    return (
      <View key={`${resource.name}-${resource.phone || ''}`} style={[styles.resourceCard, { borderLeftColor: categoryColor }]}>
        <View style={styles.resourceHeader}>
          <Text style={styles.resourceName}>{resource.name}</Text>
          {isSaved ? (
            <TouchableOpacity onPress={() => removeSavedResource(resource.resource_id!)}>
              <Ionicons name="bookmark" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          ) : !isAlreadySaved ? (
            <TouchableOpacity onPress={() => saveResource(resource)}>
              <Ionicons name="bookmark-outline" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ) : (
            <Ionicons name="bookmark" size={22} color={COLORS.primary} />
          )}
        </View>
        
        <Text style={styles.resourceDescription}>{resource.description}</Text>
        
        {resource.notes && (
          <View style={styles.notesContainer}>
            <Ionicons name="information-circle" size={14} color={COLORS.info} />
            <Text style={styles.notesText}>{resource.notes}</Text>
          </View>
        )}
        
        <View style={styles.resourceActions}>
          {resource.phone && (
            <TouchableOpacity style={styles.actionButton} onPress={() => callPhone(resource.phone!)}>
              <Ionicons name="call" size={16} color={COLORS.success} />
              <Text style={styles.actionText}>{resource.phone}</Text>
            </TouchableOpacity>
          )}
          
          {resource.website && (
            <TouchableOpacity style={styles.actionButton} onPress={() => openLink(resource.website!)}>
              <Ionicons name="globe" size={16} color={COLORS.info} />
              <Text style={[styles.actionText, { color: COLORS.info }]}>Website</Text>
            </TouchableOpacity>
          )}
          
          {resource.email && (
            <TouchableOpacity style={styles.actionButton} onPress={() => sendEmail(resource.email!)}>
              <Ionicons name="mail" size={16} color={COLORS.secondary} />
              <Text style={styles.actionText}>Email</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {resource.address && (
          <View style={styles.addressContainer}>
            <Ionicons name="location" size={14} color={COLORS.textSecondary} />
            <Text style={styles.addressText}>{resource.address}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity testID="back-support" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Find Support</Text>
        <TouchableOpacity onPress={() => setShowSaved(!showSaved)}>
          <Ionicons 
            name={showSaved ? "search" : "bookmarks"} 
            size={24} 
            color={COLORS.primary} 
          />
        </TouchableOpacity>
      </View>

      {showSaved ? (
        // SAVED RESOURCES VIEW
        <ScrollView 
          style={styles.content}
          refreshControl={<RefreshControl refreshing={false} onRefresh={loadSavedResources} />}
        >
          <View style={styles.savedHeader}>
            <Ionicons name="bookmarks" size={24} color={COLORS.primary} />
            <Text style={styles.savedTitle}>Saved Resources</Text>
          </View>
          
          {savedResources.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="bookmark-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No saved resources</Text>
              <Text style={styles.emptyText}>Bookmark helpful resources to access them quickly later</Text>
            </View>
          ) : (
            savedResources.map(resource => renderResourceCard(resource, true))
          )}
        </ScrollView>
      ) : (
        // SEARCH VIEW
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="heart-circle" size={24} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Find local caregiver support services, government programs, and healthcare resources in your area.
            </Text>
          </View>

          {/* Location Input */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Your Location *</Text>
            <View style={styles.locationInput}>
              <Ionicons name="location" size={20} color={COLORS.textSecondary} style={{ marginRight: SPACING.sm }} />
              <TextInput
                testID="location-input"
                style={styles.textInput}
                placeholder="e.g., Toronto, Ontario, Canada"
                placeholderTextColor={COLORS.border}
                value={location}
                onChangeText={setLocation}
              />
            </View>
            <Text style={styles.hint}>Enter city, province/state, and country for best results</Text>
          </View>

          {/* Category Selection */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>What type of support do you need? *</Text>
            {loadingCategories ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <View style={styles.categoryGrid}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    testID={`cat-${cat.id}`}
                    style={[
                      styles.categoryCard,
                      selectedCategory === cat.id && { 
                        borderColor: CATEGORY_COLORS[cat.id] || COLORS.primary,
                        backgroundColor: (CATEGORY_COLORS[cat.id] || COLORS.primary) + '10'
                      }
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Ionicons 
                      name={cat.icon as any} 
                      size={24} 
                      color={selectedCategory === cat.id ? CATEGORY_COLORS[cat.id] : COLORS.textSecondary} 
                    />
                    <Text style={[
                      styles.categoryName,
                      selectedCategory === cat.id && { color: CATEGORY_COLORS[cat.id] }
                    ]}>{cat.name}</Text>
                    <Text style={styles.categoryDesc}>{cat.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Additional Query */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Additional Search Terms (Optional)</Text>
            <TextInput
              testID="query-input"
              style={styles.queryInput}
              placeholder="e.g., wheelchair rental, dementia day program"
              placeholderTextColor={COLORS.border}
              value={specificQuery}
              onChangeText={setSpecificQuery}
            />
          </View>

          {/* Search Button */}
          <TouchableOpacity 
            testID="search-btn"
            style={[styles.searchButton, loading && { opacity: 0.7 }]}
            onPress={searchResources}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="search" size={20} color={COLORS.white} />
                <Text style={styles.searchButtonText}>Search Resources</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Results Section */}
          {hasSearched && !loading && (
            <View style={styles.resultsSection}>
              {essentialResources.length > 0 && (
                <>
                  <View style={styles.resultsDivider}>
                    <Ionicons name="star" size={16} color={COLORS.warning} />
                    <Text style={styles.resultsLabel}>Essential Resources</Text>
                  </View>
                  {essentialResources.map(resource => renderResourceCard(resource))}
                </>
              )}
              
              {resources.length > 0 && (
                <>
                  <View style={styles.resultsDivider}>
                    <Ionicons name="list" size={16} color={COLORS.primary} />
                    <Text style={styles.resultsLabel}>Local Resources ({resources.length})</Text>
                  </View>
                  {resources.map(resource => renderResourceCard(resource))}
                </>
              )}

              {resources.length === 0 && essentialResources.length === 0 && (
                <View style={styles.noResults}>
                  <Ionicons name="search-outline" size={48} color={COLORS.border} />
                  <Text style={styles.noResultsText}>No resources found</Text>
                  <Text style={styles.noResultsHint}>Try a different location or category</Text>
                </View>
              )}
            </View>
          )}

          <View style={{ height: SPACING.xxl }} />
        </ScrollView>
      )}
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
    paddingVertical: SPACING.md 
  },
  title: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.textPrimary },
  content: { flex: 1 },
  
  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  infoText: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, lineHeight: 20 },
  
  // Input Sections
  inputSection: { marginHorizontal: SPACING.lg, marginTop: SPACING.lg },
  label: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  hint: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 4 },
  
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
  },
  textInput: { flex: 1, height: 48, fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
  queryInput: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 48,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  
  // Category Grid
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  categoryCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: SPACING.md,
    alignItems: 'center',
  },
  categoryName: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.xs, textAlign: 'center' },
  categoryDesc: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
  
  // Search Button
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  searchButtonText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.white },
  
  // Results
  resultsSection: { marginTop: SPACING.xl },
  resultsDivider: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginHorizontal: SPACING.lg, 
    marginBottom: SPACING.sm,
    gap: SPACING.xs 
  },
  resultsLabel: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary },
  
  // Resource Card
  resourceCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderLeftWidth: 4,
  },
  resourceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  resourceName: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary, flex: 1, marginRight: SPACING.sm },
  resourceDescription: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs, lineHeight: 20 },
  notesContainer: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    backgroundColor: COLORS.info + '10', 
    padding: SPACING.sm, 
    borderRadius: RADIUS.md, 
    marginTop: SPACING.sm,
    gap: SPACING.xs 
  },
  notesText: { flex: 1, fontSize: FONT_SIZES.xs, color: COLORS.info },
  resourceActions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: SPACING.sm, gap: SPACING.sm },
  actionButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.background, 
    paddingHorizontal: SPACING.sm, 
    paddingVertical: SPACING.xs, 
    borderRadius: RADIUS.full,
    gap: 4 
  },
  actionText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  addressContainer: { flexDirection: 'row', alignItems: 'flex-start', marginTop: SPACING.sm, gap: 4 },
  addressText: { flex: 1, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  
  // No Results
  noResults: { alignItems: 'center', paddingVertical: SPACING.xxl },
  noResultsText: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  noResultsHint: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  
  // Saved Resources
  savedHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginHorizontal: SPACING.lg, 
    marginTop: SPACING.md, 
    marginBottom: SPACING.md,
    gap: SPACING.sm 
  },
  savedTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  emptyText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs, textAlign: 'center', paddingHorizontal: SPACING.xl },
});
