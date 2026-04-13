import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants/theme';

const ITEM_TYPES = [
  { key: 'legal', label: 'Legal', icon: 'document-text', color: COLORS.info },
  { key: 'financial', label: 'Financial', icon: 'cash', color: COLORS.success },
  { key: 'insurance', label: 'Insurance', icon: 'shield-checkmark', color: COLORS.primary },
  { key: 'estate', label: 'Estate', icon: 'home', color: '#9B59B6' },
];

function statusColor(st: string) {
  if (st === 'completed') return COLORS.success;
  if (st === 'in_progress') return COLORS.warning;
  return COLORS.textSecondary;
}

interface LegalItemCardProps {
  item: any;
  onEdit: (item: any) => void;
  onDelete: (id: string, title: string) => void;
  onViewImage: (uri: string) => void;
}

export default function LegalItemCard({ item, onEdit, onDelete, onViewImage }: LegalItemCardProps) {
  const typeInfo = ITEM_TYPES.find(t => t.key === item.item_type) || ITEM_TYPES[0];

  return (
    <TouchableOpacity
      style={s.card}
      onPress={() => onEdit(item)}
      activeOpacity={0.7}
      data-testid={`legal-card-${item.item_id}`}
    >
      <View style={s.row}>
        <View style={[s.typeBadge, { backgroundColor: typeInfo.color + '15' }]}>
          <Ionicons name={typeInfo.icon as any} size={12} color={typeInfo.color} />
          <Text style={[s.typeText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
        </View>
        <View style={s.cardActions}>
          <View style={[s.statusBadge, { backgroundColor: statusColor(item.status) + '15' }]}>
            <Text style={[s.statusText, { color: statusColor(item.status) }]}>
              {item.status?.replace('_', ' ')}
            </Text>
          </View>
          <TouchableOpacity style={s.actionBtn} onPress={() => onEdit(item)}>
            <Ionicons name="pencil" size={16} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={() => onDelete(item.item_id, item.title)}>
            <Ionicons name="trash-outline" size={16} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={s.cardTitle}>{item.title}</Text>
      {item.description ? <Text style={s.cardDesc}>{item.description}</Text> : null}
      {item.contact_person ? (
        <View style={s.detailRow}>
          <Ionicons name="person" size={12} color={COLORS.textSecondary} />
          <Text style={s.sub}>{item.contact_person}</Text>
        </View>
      ) : null}
      {item.due_date ? (
        <View style={s.detailRow}>
          <Ionicons name="calendar" size={12} color={COLORS.textSecondary} />
          <Text style={s.sub}>Due: {item.due_date}</Text>
        </View>
      ) : null}

      {item.image ? (
        <TouchableOpacity style={s.imageThumbnailContainer} onPress={() => onViewImage(item.image)}>
          <Image source={{ uri: item.image }} style={s.imageThumbnail} />
          <View style={s.imageOverlay}>
            <Ionicons name="expand" size={16} color={COLORS.white} />
            <Text style={s.imageOverlayText}>View Document</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      <View style={s.editHint}>
        <Text style={s.editHintText}>Tap to edit</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: { marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full, gap: 4 },
  typeText: { fontSize: FONT_SIZES.xs, fontWeight: '700' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full },
  statusText: { fontSize: FONT_SIZES.xs, fontWeight: '700', textTransform: 'capitalize' },
  actionBtn: { padding: SPACING.xs, borderRadius: RADIUS.md },
  cardTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.xs },
  cardDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  sub: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  editHint: { alignItems: 'flex-end', marginTop: SPACING.xs },
  editHintText: { fontSize: FONT_SIZES.xs, color: COLORS.border, fontStyle: 'italic' },
  imageThumbnailContainer: { marginTop: SPACING.sm, borderRadius: RADIUS.md, overflow: 'hidden', height: 80 },
  imageThumbnail: { width: '100%', height: 80, borderRadius: RADIUS.md },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 4, gap: 4 },
  imageOverlayText: { color: COLORS.white, fontSize: FONT_SIZES.xs, fontWeight: '600' },
});
