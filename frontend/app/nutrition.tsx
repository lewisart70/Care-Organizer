import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Modal, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';

const MEAL_CATEGORIES = [
  { key: 'breakfast', label: 'Breakfast', icon: 'sunny', color: '#F39C12' },
  { key: 'lunch', label: 'Lunch', icon: 'restaurant', color: '#27AE60' },
  { key: 'dinner', label: 'Dinner', icon: 'moon', color: '#8E44AD' },
  { key: 'snack', label: 'Snacks', icon: 'cafe', color: '#E67E22' },
];

export default function NutritionScreen() {
  const { selectedRecipientId } = useAuth();
  const router = useRouter();
  const [favoriteMeals, setFavoriteMeals] = useState<any>({
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('breakfast');
  const [newMeal, setNewMeal] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!selectedRecipientId) { setLoading(false); return; }
    try {
      const data = await api.get(`/care-recipients/${selectedRecipientId}`);
      if (data.favorite_meals) {
        setFavoriteMeals(data.favorite_meals);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [selectedRecipientId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAddMeal = async () => {
    if (!newMeal.trim()) { Alert.alert('Required', 'Please enter a meal name'); return; }
    setSaving(true);
    try {
      const updatedMeals = {
        ...favoriteMeals,
        [selectedCategory]: [...(favoriteMeals[selectedCategory] || []), newMeal.trim()]
      };
      await api.put(`/care-recipients/${selectedRecipientId}`, { favorite_meals: updatedMeals });
      setFavoriteMeals(updatedMeals);
      setNewMeal('');
      setShowAdd(false);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const handleRemoveMeal = async (category: string, mealIndex: number) => {
    Alert.alert('Remove Meal', 'Are you sure you want to remove this meal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            const updatedMeals = {
              ...favoriteMeals,
              [category]: favoriteMeals[category].filter((_: any, i: number) => i !== mealIndex)
            };
            await api.put(`/care-recipients/${selectedRecipientId}`, { favorite_meals: updatedMeals });
            setFavoriteMeals(updatedMeals);
          } catch (e: any) { Alert.alert('Error', e.message); }
        }
      }
    ]);
  };

  const getCategoryInfo = (key: string) => MEAL_CATEGORIES.find(c => c.key === key) || MEAL_CATEGORIES[0];

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity testID="back-nutrition" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Favorite Meals</Text>
        <TouchableOpacity testID="add-meal-btn" style={s.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Helpful tip */}
      <View style={s.tipContainer}>
        <Ionicons name="heart" size={16} color={COLORS.primary} />
        <Text style={s.tipText}>
          Keep track of meals your loved one enjoys. Helpful for meal planning and when other caregivers are helping.
        </Text>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={COLORS.primary} />}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
        ) : (
          MEAL_CATEGORIES.map(category => (
            <View key={category.key} style={s.categorySection}>
              <View style={s.categoryHeader}>
                <View style={[s.categoryIcon, { backgroundColor: category.color + '20' }]}>
                  <Ionicons name={category.icon as any} size={20} color={category.color} />
                </View>
                <Text style={s.categoryTitle}>{category.label}</Text>
                <TouchableOpacity
                  style={s.addCategoryBtn}
                  onPress={() => { setSelectedCategory(category.key); setShowAdd(true); }}
                >
                  <Ionicons name="add" size={18} color={category.color} />
                </TouchableOpacity>
              </View>

              {(favoriteMeals[category.key] || []).length === 0 ? (
                <Text style={s.noMeals}>No favorite {category.label.toLowerCase()} meals yet</Text>
              ) : (
                <View style={s.mealsGrid}>
                  {(favoriteMeals[category.key] || []).map((meal: string, index: number) => (
                    <TouchableOpacity
                      key={index}
                      style={[s.mealChip, { borderColor: category.color + '40' }]}
                      onLongPress={() => handleRemoveMeal(category.key, index)}
                    >
                      <Text style={s.mealChipText}>{meal}</Text>
                      <TouchableOpacity
                        style={s.removeMealBtn}
                        onPress={() => handleRemoveMeal(category.key, index)}
                      >
                        <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Meal Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.mHeader}>
            <TouchableOpacity onPress={() => { setShowAdd(false); setNewMeal(''); }}>
              <Text style={s.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.mTitle}>Add Favorite Meal</Text>
            <TouchableOpacity testID="save-meal-btn" onPress={handleAddMeal} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={s.save}>Add</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={s.mBody} keyboardShouldPersistTaps="handled">
            <Text style={s.fl}>Meal Category</Text>
            <View style={s.categoryChips}>
              {MEAL_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.key}
                  testID={`select-${cat.key}`}
                  style={[
                    s.catChip,
                    selectedCategory === cat.key && { backgroundColor: cat.color, borderColor: cat.color }
                  ]}
                  onPress={() => setSelectedCategory(cat.key)}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={16}
                    color={selectedCategory === cat.key ? COLORS.white : cat.color}
                  />
                  <Text style={[
                    s.catChipText,
                    selectedCategory === cat.key && { color: COLORS.white }
                  ]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.fg}>
              <Text style={s.fl}>Meal Name</Text>
              <TextInput
                testID="meal-name-input"
                style={s.fi}
                placeholder="e.g., Oatmeal with berries"
                placeholderTextColor={COLORS.border}
                value={newMeal}
                onChangeText={setNewMeal}
                autoFocus
              />
            </View>

            <View style={s.suggestionBox}>
              <Ionicons name="bulb-outline" size={16} color={COLORS.info} />
              <Text style={s.suggestionText}>
                Tip: Add meals they enjoy so caregivers know what to prepare!
              </Text>
            </View>
          </ScrollView>
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

  // Tip section
  tipContainer: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: COLORS.primary + '10',
    borderRadius: RADIUS.md, gap: 8,
  },
  tipText: {
    flex: 1, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, lineHeight: 18,
  },

  // Category sections
  categorySection: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  categoryHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  categoryIcon: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  categoryTitle: {
    flex: 1,
    fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },
  addCategoryBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.surface,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  noMeals: {
    fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontStyle: 'italic',
    marginLeft: 44,
  },
  mealsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    marginLeft: 44, gap: 8,
  },
  mealChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: SPACING.xs, paddingLeft: SPACING.md, paddingRight: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  mealChipText: {
    fontSize: FONT_SIZES.sm, color: COLORS.textPrimary,
  },
  removeMealBtn: {
    marginLeft: 4, padding: 2,
  },

  // Modal styles
  modal: { flex: 1, backgroundColor: COLORS.background },
  mHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, 
    borderBottomWidth: 1, borderBottomColor: COLORS.border 
  },
  mTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  cancel: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  save: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '700' },
  mBody: { padding: SPACING.lg },

  fg: { marginBottom: SPACING.md },
  fl: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  fi: { 
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, 
    borderWidth: 1.5, borderColor: COLORS.border, 
    paddingHorizontal: SPACING.md, height: 48, 
    fontSize: FONT_SIZES.md, color: COLORS.textPrimary 
  },

  categoryChips: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 8, marginBottom: SPACING.lg,
  },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border,
  },
  catChipText: {
    fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textSecondary,
  },

  suggestionBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: SPACING.md,
    backgroundColor: COLORS.info + '10',
    borderRadius: RADIUS.lg,
    marginTop: SPACING.md,
  },
  suggestionText: {
    flex: 1, fontSize: FONT_SIZES.xs, color: COLORS.info,
  },
});
