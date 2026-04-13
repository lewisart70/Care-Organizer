import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants/theme';

const CATEGORIES = [
  { id: 'doctor', label: 'Doctor', icon: 'medkit', color: COLORS.primary },
  { id: 'psw', label: 'PSW', icon: 'person', color: COLORS.secondary },
  { id: 'grooming', label: 'Grooming', icon: 'cut', color: '#9C27B0' },
  { id: 'footcare', label: 'Foot Care', icon: 'footsteps', color: '#FF9800' },
  { id: 'respite', label: 'Respite', icon: 'home', color: '#4CAF50' },
  { id: 'therapy', label: 'Therapy', icon: 'fitness', color: '#00BCD4' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal', color: COLORS.textSecondary },
];

interface AppointmentCardProps {
  appointment: any;
  onEdit: (appt: any) => void;
  onDelete: (id: string, title: string) => void;
}

export default function AppointmentCard({ appointment: a, onEdit, onDelete }: AppointmentCardProps) {
  const cat = CATEGORIES.find(c => c.id === a.category) || CATEGORIES[CATEGORIES.length - 1];

  return (
    <TouchableOpacity
      style={[s.card, { borderLeftColor: cat.color }]}
      onPress={() => onEdit(a)}
      activeOpacity={0.7}
      data-testid={`appt-card-${a.appointment_id}`}
    >
      <View style={s.row}>
        <View style={s.dateBox}>
          <Ionicons name="calendar" size={20} color={COLORS.primary} />
          <Text style={s.dateText}>{a.date}</Text>
        </View>
        <View style={s.cardActions}>
          <TouchableOpacity testID={`edit-appt-${a.appointment_id}`} style={s.actionBtn} onPress={() => onEdit(a)}>
            <Ionicons name="pencil" size={16} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity testID={`del-appt-${a.appointment_id}`} style={s.actionBtn} onPress={() => onDelete(a.appointment_id, a.title)}>
            <Ionicons name="trash-outline" size={16} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>

      {a.category && (
        <View style={[s.categoryBadge, { backgroundColor: cat.color + '20' }]}>
          <Ionicons name={cat.icon as any} size={12} color={cat.color} />
          <Text style={[s.categoryText, { color: cat.color }]}>{cat.label}</Text>
        </View>
      )}

      <Text style={s.cardTitle}>{a.title}</Text>
      {a.time ? <Text style={s.cardSub}><Ionicons name="time-outline" size={14} /> {a.time}</Text> : null}
      {a.doctor_name ? <Text style={s.cardSub}><Ionicons name="person-outline" size={14} /> {a.doctor_name}</Text> : null}
      {a.location ? <Text style={s.cardSub}><Ionicons name="location-outline" size={14} /> {a.location}</Text> : null}

      {(a.blood_pressure || a.weight) ? (
        <View style={s.vitalsRow}>
          {a.blood_pressure ? (
            <View style={s.vitalChip}>
              <Ionicons name="heart" size={12} color={COLORS.error} />
              <Text style={s.vitalText}>BP: {a.blood_pressure}</Text>
            </View>
          ) : null}
          {a.weight ? (
            <View style={s.vitalChip}>
              <Ionicons name="scale" size={12} color={COLORS.secondary} />
              <Text style={s.vitalText}>{a.weight}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {a.repeats && a.repeat_frequency ? (
        <View style={s.repeatBadge}>
          <Ionicons name="repeat" size={12} color={COLORS.info} />
          <Text style={s.repeatText}>Repeats {a.repeat_frequency}</Text>
        </View>
      ) : null}

      {a.notes ? <Text style={s.cardNotes} numberOfLines={3}>{a.notes}</Text> : null}
      <View style={s.editHint}>
        <Text style={s.editHintText}>Tap to edit</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: { marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateBox: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: '600', marginLeft: 4 },
  cardActions: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: { padding: SPACING.xs, borderRadius: RADIUS.md },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full, marginTop: SPACING.xs, gap: 4 },
  categoryText: { fontSize: FONT_SIZES.xs, fontWeight: '700' },
  cardTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary, marginTop: 4 },
  cardSub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  cardNotes: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: SPACING.sm, fontStyle: 'italic', backgroundColor: COLORS.background, padding: SPACING.sm, borderRadius: RADIUS.md },
  editHint: { alignItems: 'flex-end', marginTop: SPACING.xs },
  editHintText: { fontSize: FONT_SIZES.xs, color: COLORS.border, fontStyle: 'italic' },
  vitalsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  vitalChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.md, gap: 4 },
  vitalText: { fontSize: FONT_SIZES.xs, color: COLORS.textPrimary, fontWeight: '600' },
  repeatBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: COLORS.info + '15', paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.md, marginTop: SPACING.xs, gap: 4 },
  repeatText: { fontSize: FONT_SIZES.xs, color: COLORS.info, fontWeight: '600' },
});
