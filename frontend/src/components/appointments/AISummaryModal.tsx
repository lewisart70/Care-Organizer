import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants/theme';

interface AISummaryModalContentProps {
  summary: string;
  onClose: () => void;
  onAddToNotes: () => void;
}

export default function AISummaryModalContent({ summary, onClose, onAddToNotes }: AISummaryModalContentProps) {
  return (
    <View style={s.overlay}>
      <View style={s.modal}>
        <View style={s.header}>
          <View style={s.titleRow}>
            <Ionicons name="sparkles" size={24} color={COLORS.secondary} />
            <Text style={s.title}>AI Summary</Text>
          </View>
          <TouchableOpacity onPress={onClose} data-testid="close-summary-btn">
            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={s.content}>
          <Text style={s.text}>{summary}</Text>
        </ScrollView>
        <TouchableOpacity style={s.addBtn} onPress={onAddToNotes} data-testid="add-summary-to-notes-btn">
          <Ionicons name="add" size={20} color={COLORS.white} />
          <Text style={s.addBtnText}>Add Summary to Notes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  content: { padding: SPACING.lg, maxHeight: 400 },
  text: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, lineHeight: 22 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, margin: SPACING.lg, padding: SPACING.md, borderRadius: RADIUS.lg, gap: 8 },
  addBtnText: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '700' },
});
