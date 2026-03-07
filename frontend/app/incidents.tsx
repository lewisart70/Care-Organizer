import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Modal, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';

const INCIDENT_TYPES = ['fall', 'medical', 'behavioral', 'medication', 'other'];
const SEVERITIES = ['mild', 'moderate', 'severe'];

export default function IncidentsScreen() {
  const { selectedRecipientId } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingIncident, setEditingIncident] = useState<any>(null);
  const [form, setForm] = useState({ 
    incident_type: 'fall', 
    description: '', 
    severity: 'moderate', 
    location: '', 
    injuries: '', 
    action_taken: '' 
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!selectedRecipientId) { setLoading(false); return; }
    try { 
      setItems(await api.get(`/care-recipients/${selectedRecipientId}/incidents`)); 
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  }, [selectedRecipientId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAddModal = () => {
    setEditingIncident(null);
    setForm({ 
      incident_type: 'fall', 
      description: '', 
      severity: 'moderate', 
      location: '', 
      injuries: '', 
      action_taken: '' 
    });
    setShowAdd(true);
  };

  const openEditModal = (incident: any) => {
    setEditingIncident(incident);
    setForm({
      incident_type: incident.incident_type || 'fall',
      description: incident.description || '',
      severity: incident.severity || 'moderate',
      location: incident.location || '',
      injuries: incident.injuries || '',
      action_taken: incident.action_taken || '',
    });
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!form.description.trim()) { 
      Alert.alert('Required', 'Description is required'); 
      return; 
    }
    setSaving(true);
    try { 
      if (editingIncident) {
        await api.put(`/care-recipients/${selectedRecipientId}/incidents/${editingIncident.incident_id}`, form);
        Alert.alert('Updated', 'Incident updated successfully');
      } else {
        await api.post(`/care-recipients/${selectedRecipientId}/incidents`, form); 
      }
      setShowAdd(false); 
      setEditingIncident(null);
      setForm({ 
        incident_type: 'fall', 
        description: '', 
        severity: 'moderate', 
        location: '', 
        injuries: '', 
        action_taken: '' 
      }); 
      await load(); 
    } catch (e: any) { 
      Alert.alert('Error', e.message); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleDelete = (incidentId: string, incidentType: string) => {
    Alert.alert(
      'Delete Incident',
      `Are you sure you want to delete this ${incidentType} incident?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try { 
              await api.del(`/care-recipients/${selectedRecipientId}/incidents/${incidentId}`); 
              await load(); 
            } catch (e: any) { 
              Alert.alert('Error', e.message); 
            }
          }
        }
      ]
    );
  };

  const severityColor = (s: string) => s === 'severe' ? COLORS.error : s === 'moderate' ? COLORS.warning : COLORS.success;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity testID="back-incidents" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Incidents & Falls</Text>
        <TouchableOpacity testID="add-incident-btn" onPress={openAddModal}>
          <Ionicons name="add-circle" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={COLORS.primary} />}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
        ) : items.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="alert-circle-outline" size={48} color={COLORS.primaryLight} />
            <Text style={s.emptyTitle}>No incidents recorded</Text>
            <Text style={s.emptyText}>Log incidents and falls to track patterns and inform care decisions</Text>
          </View>
        ) : (
          items.map(i => (
            <TouchableOpacity 
              key={i.incident_id} 
              style={[s.card, { borderLeftColor: severityColor(i.severity) }]}
              onPress={() => openEditModal(i)}
              activeOpacity={0.7}
            >
              <View style={s.row}>
                <View style={s.headerRow}>
                  <View style={[s.badge, { backgroundColor: severityColor(i.severity) + '15' }]}>
                    <Text style={[s.badgeText, { color: severityColor(i.severity) }]}>
                      {i.severity?.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={s.type}>{i.incident_type}</Text>
                </View>
                <View style={s.actions}>
                  <TouchableOpacity 
                    testID={`edit-incident-${i.incident_id}`} 
                    style={s.actionBtn}
                    onPress={() => openEditModal(i)}
                  >
                    <Ionicons name="pencil" size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    testID={`del-incident-${i.incident_id}`} 
                    style={s.actionBtn}
                    onPress={() => handleDelete(i.incident_id, i.incident_type)}
                  >
                    <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={s.desc}>{i.description}</Text>
              {i.location && <Text style={s.detail}>Location: {i.location}</Text>}
              {i.injuries && <Text style={s.detail}>Injuries: {i.injuries}</Text>}
              {i.action_taken && <Text style={s.detail}>Action: {i.action_taken}</Text>}
              <View style={s.cardFooter}>
                <Text style={s.meta}>
                  {i.reported_by} • {i.created_at ? new Date(i.created_at).toLocaleDateString() : ''}
                </Text>
                <Text style={s.editHintText}>Tap to edit</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.mHeader}>
            <TouchableOpacity onPress={() => { setShowAdd(false); setEditingIncident(null); }}>
              <Text style={s.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.mTitle}>{editingIncident ? 'Edit Incident' : 'Log Incident'}</Text>
            <TouchableOpacity testID="save-incident-btn" onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={s.save}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
          <ScrollView style={s.mBody} keyboardShouldPersistTaps="handled">
            <Text style={s.fl}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
              {INCIDENT_TYPES.map(t => (
                <TouchableOpacity 
                  key={t} 
                  testID={`type-${t}`} 
                  style={[s.chip, form.incident_type === t && s.chipActive]} 
                  onPress={() => setForm({ ...form, incident_type: t })}
                >
                  <Text style={[s.chipText, form.incident_type === t && s.chipTextActive]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.fl}>Severity</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
              {SEVERITIES.map(sv => (
                <TouchableOpacity 
                  key={sv} 
                  testID={`sev-${sv}`} 
                  style={[s.chip, form.severity === sv && { backgroundColor: severityColor(sv), borderColor: severityColor(sv) }]} 
                  onPress={() => setForm({ ...form, severity: sv })}
                >
                  <Text style={[s.chipText, form.severity === sv && { color: COLORS.white }]}>
                    {sv.charAt(0).toUpperCase() + sv.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={s.fg}>
              <Text style={s.fl}>Description *</Text>
              <TextInput 
                testID="inc-description" 
                style={s.ta} 
                placeholder="What happened?" 
                placeholderTextColor={COLORS.border} 
                value={form.description} 
                onChangeText={v => setForm({ ...form, description: v })} 
                multiline 
                textAlignVertical="top" 
              />
            </View>

            <View style={s.fg}>
              <Text style={s.fl}>Location</Text>
              <TextInput 
                testID="inc-location" 
                style={s.fi} 
                placeholder="Where did it happen?" 
                placeholderTextColor={COLORS.border} 
                value={form.location} 
                onChangeText={v => setForm({ ...form, location: v })} 
              />
            </View>

            <View style={s.fg}>
              <Text style={s.fl}>Injuries</Text>
              <TextInput 
                testID="inc-injuries" 
                style={s.fi} 
                placeholder="Describe any injuries" 
                placeholderTextColor={COLORS.border} 
                value={form.injuries} 
                onChangeText={v => setForm({ ...form, injuries: v })} 
              />
            </View>

            <View style={s.fg}>
              <Text style={s.fl}>Action Taken</Text>
              <TextInput 
                testID="inc-action_taken" 
                style={s.ta} 
                placeholder="What was done?" 
                placeholderTextColor={COLORS.border} 
                value={form.action_taken} 
                onChangeText={v => setForm({ ...form, action_taken: v })} 
                multiline 
                textAlignVertical="top" 
              />
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
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: SPACING.lg, 
    paddingVertical: SPACING.md 
  },
  title: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.textPrimary },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl, paddingHorizontal: SPACING.lg },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  emptyText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs, textAlign: 'center' },
  card: { 
    marginHorizontal: SPACING.lg, 
    marginBottom: SPACING.sm, 
    padding: SPACING.md, 
    backgroundColor: COLORS.surface, 
    borderRadius: RADIUS.lg, 
    borderLeftWidth: 4 
  },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 4 
  },
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flex: 1
  },
  badge: { 
    paddingHorizontal: SPACING.sm, 
    paddingVertical: 2, 
    borderRadius: RADIUS.full, 
    marginRight: SPACING.sm 
  },
  badgeText: { fontSize: 10, fontWeight: '800' },
  type: { 
    fontSize: FONT_SIZES.sm, 
    fontWeight: '600', 
    color: COLORS.textSecondary, 
    textTransform: 'capitalize' 
  },
  actions: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: { padding: SPACING.xs, borderRadius: RADIUS.md },
  desc: { fontSize: FONT_SIZES.md, color: COLORS.textPrimary, lineHeight: 20, marginTop: SPACING.xs },
  detail: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 4 },
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: SPACING.sm 
  },
  meta: { 
    fontSize: FONT_SIZES.xs, 
    color: COLORS.textSecondary, 
    fontStyle: 'italic' 
  },
  editHintText: { fontSize: FONT_SIZES.xs, color: COLORS.border, fontStyle: 'italic' },
  modal: { flex: 1, backgroundColor: COLORS.background },
  mHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: SPACING.lg, 
    paddingVertical: SPACING.md, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border 
  },
  mTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  cancel: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  save: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '700' },
  mBody: { padding: SPACING.lg },
  fg: { marginBottom: SPACING.md },
  fl: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  fi: { 
    backgroundColor: COLORS.surface, 
    borderRadius: RADIUS.lg, 
    borderWidth: 1.5, 
    borderColor: COLORS.border, 
    paddingHorizontal: SPACING.md, 
    height: 48, 
    fontSize: FONT_SIZES.md, 
    color: COLORS.textPrimary 
  },
  ta: { 
    backgroundColor: COLORS.surface, 
    borderRadius: RADIUS.lg, 
    borderWidth: 1.5, 
    borderColor: COLORS.border, 
    padding: SPACING.md, 
    fontSize: FONT_SIZES.md, 
    color: COLORS.textPrimary, 
    minHeight: 80 
  },
  chip: { 
    paddingHorizontal: SPACING.md, 
    paddingVertical: SPACING.xs, 
    borderRadius: RADIUS.full, 
    backgroundColor: COLORS.surface, 
    borderWidth: 1.5, 
    borderColor: COLORS.border, 
    marginRight: SPACING.sm 
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white },
});
