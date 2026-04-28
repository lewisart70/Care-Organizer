import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Modal, Alert, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../../src/constants/theme';

const CATEGORIES = [
  { id: 'general', name: 'General', icon: 'document-text', color: '#3498DB' },
  { id: 'medical', name: 'Medical', icon: 'medical', color: '#E74C3C' },
  { id: 'incident', name: 'Incident/Fall', icon: 'alert-circle', color: '#E67E22' },
  { id: 'bathing', name: 'Bathing', icon: 'water', color: '#9B59B6' },
  { id: 'routine', name: 'Daily Routine', icon: 'time', color: '#1ABC9C' },
  { id: 'behavior', name: 'Behavior', icon: 'happy', color: '#F39C12' },
  { id: 'mood', name: 'Mood', icon: 'heart', color: '#E91E63' },
];

export default function NotesTab() {
  const { selectedRecipientId } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [filter, setFilter] = useState('all');
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  // Audio recorder hook
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const loadNotes = useCallback(async () => {
    if (!selectedRecipientId) { setLoading(false); return; }
    try { setNotes(await api.get(`/care-recipients/${selectedRecipientId}/notes`)); }
    catch (e) {  }
    finally { setLoading(false); }
  }, [selectedRecipientId]);

  useFocusEffect(useCallback(() => { loadNotes(); }, [loadNotes]));

  const openAddModal = () => {
    setEditingNote(null);
    setContent('');
    setCategory('general');
    setShowAdd(true);
  };

  const openEditModal = (note: any) => {
    setEditingNote(note);
    setContent(note.content || '');
    setCategory(note.category || 'general');
    setShowAdd(true);
  };

  const startRecording = async () => {
    try {
      // Set audio mode for recording
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      // Prepare and start recording
      await recorder.prepareToRecordAsync();
      await recorder.record();
      setIsRecording(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;

    setIsRecording(false);
    setIsTranscribing(true);

    try {
      await recorder.stop();
      const uri = recorder.uri;

      if (uri) {
        // Convert audio to base64
        const response = await fetch(uri);
        const blob = await response.blob();
        
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        // Send to backend for transcription
        const result = await api.post('/transcribe', {
          audio_base64: base64,
          language: 'en',
        });

        if (result.success && result.text) {
          // Append transcribed text to existing content
          setContent(prev => {
            if (prev.trim()) {
              return prev + ' ' + result.text;
            }
            return result.text;
          });
        }
      }
    } catch (err: any) {
      Alert.alert('Transcription Failed', err.message || 'Could not transcribe audio');
    } finally {
      setIsTranscribing(false);
      // Reset audio mode
      await setAudioModeAsync({
        allowsRecording: false,
      });
    }
  };

  const handleSave = async () => {
    if (!content.trim()) { Alert.alert('Required', 'Please enter a note'); return; }
    if (!selectedRecipientId) { Alert.alert('Error', 'Please select a care recipient first'); return; }
    setSaving(true);
    try {
      if (editingNote) {
        await api.put(`/care-recipients/${selectedRecipientId}/notes/${editingNote.note_id || editingNote.id}`, { content, category });
        // For edits, just close and reload
        setShowAdd(false);
        setEditingNote(null);
        setContent(''); 
        setCategory('general');
        await loadNotes();
      } else {
        await api.post(`/care-recipients/${selectedRecipientId}/notes`, { content, category });
        setEditingNote(null);
        setContent(''); 
        setCategory('general');
        await loadNotes();
        setShowSuccess(true);
      }
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to save note'); }
    finally { setSaving(false); }
  };
  
  const handleAddAnother = () => {
    setShowSuccess(false);
    setContent('');
    setCategory('general');
  };
  
  const handleDone = () => {
    setShowSuccess(false);
    setShowAdd(false);
  };

  const handleDelete = (noteId: string) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try { 
              await api.del(`/care-recipients/${selectedRecipientId}/notes/${noteId}`); 
              await loadNotes(); 
            } catch (e: any) { 
              Alert.alert('Error', e.message); 
            }
          }
        }
      ]
    );
  };

  const filtered = filter === 'all' ? notes : notes.filter(n => n.category === filter);

  const getCategoryColor = (cat: string) => {
    const category = CATEGORIES.find(c => c.id === cat);
    return category?.color || COLORS.info;
  };
  
  const getCategoryIcon = (cat: string) => {
    const category = CATEGORIES.find(c => c.id === cat);
    return category?.icon || 'document-text';
  };
  
  const getCategoryName = (cat: string) => {
    const category = CATEGORIES.find(c => c.id === cat);
    return category?.name || cat;
  };

  if (!selectedRecipientId) return <SafeAreaView style={styles.container}><View style={styles.centered}><Text style={styles.emptyText}>Select a care recipient first</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Caregiver Notes</Text>
        <TouchableOpacity testID="add-note-btn" style={styles.addIconBtn} onPress={openAddModal}>
          <Ionicons name="add-circle" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Pro Tip Section */}
      <View style={styles.tipContainer}>
        <View style={styles.tipHeader}>
          <Ionicons name="bulb" size={18} color={COLORS.warning} />
          <Text style={styles.tipTitle}>Tip</Text>
        </View>
        <Text style={styles.tipText}>
          Use the Voice button when adding notes to dictate hands-free. Perfect for busy caregivers!
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <TouchableOpacity 
          testID="filter-all" 
          style={[styles.filterChip, filter === 'all' && styles.filterActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        {CATEGORIES.map(cat => (
          <TouchableOpacity 
            key={cat.id} 
            testID={`filter-${cat.id}`} 
            style={[styles.filterChip, filter === cat.id && { backgroundColor: cat.color, borderColor: cat.color }]}
            onPress={() => setFilter(cat.id)}
          >
            <Ionicons name={cat.icon as any} size={14} color={filter === cat.id ? COLORS.white : cat.color} style={{ marginRight: 4 }} />
            <Text style={[styles.filterText, filter === cat.id && styles.filterTextActive]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={loadNotes} tintColor={COLORS.primary} />}>
        {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} /> :
          filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={COLORS.primaryLight} />
              <Text style={styles.emptyTitle}>No notes yet</Text>
              <Text style={styles.emptyText}>Add notes to track daily observations</Text>
            </View>
          ) : filtered.map(note => (
            <TouchableOpacity 
              key={note.note_id} 
              style={styles.noteCard}
              onPress={() => openEditModal(note)}
              activeOpacity={0.7}
            >
              <View style={styles.noteHeader}>
                <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(note.category) + '15' }]}>
                  <Ionicons name={getCategoryIcon(note.category) as any} size={12} color={getCategoryColor(note.category)} style={{ marginRight: 4 }} />
                  <Text style={[styles.categoryText, { color: getCategoryColor(note.category) }]}>{getCategoryName(note.category)}</Text>
                </View>
                <View style={styles.noteActions}>
                  <TouchableOpacity 
                    testID={`edit-note-${note.note_id}`} 
                    style={styles.actionBtn}
                    onPress={() => openEditModal(note)}
                  >
                    <Ionicons name="pencil" size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    testID={`delete-note-${note.note_id}`} 
                    style={styles.actionBtn}
                    onPress={() => handleDelete(note.note_id)}
                  >
                    <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.noteContent}>{note.content}</Text>
              <View style={styles.noteMeta}>
                <Text style={styles.noteAuthor}>{note.author_name}</Text>
                <Text style={styles.noteDate}>{note.created_at ? new Date(note.created_at).toLocaleDateString() : ''}</Text>
              </View>
              <View style={styles.editHint}>
                <Text style={styles.editHintText}>Tap to edit</Text>
              </View>
            </TouchableOpacity>
          ))}
      </ScrollView>

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          {showSuccess ? (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
              </View>
              <Text style={styles.successTitle}>Note Saved!</Text>
              <Text style={styles.successSubtitle}>Your note has been added successfully.</Text>
              <View style={styles.successButtons}>
                <TouchableOpacity style={styles.addAnotherBtn} onPress={handleAddAnother}>
                  <Ionicons name="add" size={20} color={COLORS.primary} />
                  <Text style={styles.addAnotherText}>Add Another Note</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
          <>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowAdd(false); setEditingNote(null); setContent(''); setShowSuccess(false); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingNote ? 'Edit Note' : 'Add Note'}</Text>
            <TouchableOpacity testID="save-note-btn" onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.formLabel}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity 
                  key={cat.id} 
                  testID={`cat-${cat.id}`} 
                  style={[
                    styles.catChip, 
                    category === cat.id && { backgroundColor: cat.color, borderColor: cat.color }
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Ionicons 
                    name={cat.icon as any} 
                    size={16} 
                    color={category === cat.id ? COLORS.white : cat.color} 
                  />
                  <Text style={[
                    styles.catChipText, 
                    category === cat.id && { color: COLORS.white }
                  ]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.noteLabelRow}>
              <Text style={styles.formLabel}>Note</Text>
              <TouchableOpacity 
                testID="voice-record-btn"
                style={[
                  styles.voiceBtn, 
                  isRecording && styles.voiceBtnRecording,
                  isTranscribing && styles.voiceBtnTranscribing
                ]}
                onPress={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing}
              >
                {isTranscribing ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons 
                      name={isRecording ? "stop" : "mic"} 
                      size={16} 
                      color={COLORS.white} 
                    />
                    <Text style={styles.voiceBtnText}>
                      {isRecording ? 'Stop' : 'Voice'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Recording... Tap "Stop" when done</Text>
              </View>
            )}
            
            {isTranscribing && (
              <View style={styles.transcribingIndicator}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.transcribingText}>Converting speech to text...</Text>
              </View>
            )}
            
            <TextInput
              testID="note-content-input"
              style={styles.textArea}
              placeholder="Write your observation or use voice input..."
              placeholderTextColor={COLORS.border}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            
            <View style={styles.voiceHint}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.voiceHintText}>
                Tap the Voice button to dictate your notes hands-free
              </Text>
            </View>
          </ScrollView>
          </>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: SPACING.xl, 
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  headerTitle: { 
    fontSize: FONT_SIZES.xxxl, 
    fontWeight: '800', 
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  addIconBtn: { 
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  
  // Tip section styles
  tipContainer: {
    marginHorizontal: SPACING.xl,
    marginVertical: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.warningLight,
    borderRadius: RADIUS.xl,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.warning + '30',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  tipTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.warning,
    marginLeft: 4,
  },
  tipText: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  
  filterScroll: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm, maxHeight: 56 },
  filterChip: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md, 
    paddingVertical: SPACING.sm, 
    borderRadius: RADIUS.full, 
    backgroundColor: COLORS.surface, 
    borderWidth: 1.5, 
    borderColor: COLORS.border, 
    marginRight: SPACING.sm,
    ...SHADOWS.sm,
  },
  filterActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.white },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxxl },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  emptyText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  noteCard: { 
    marginHorizontal: SPACING.xl, 
    marginBottom: SPACING.md, 
    padding: SPACING.lg, 
    backgroundColor: COLORS.surface, 
    borderRadius: RADIUS.xl, 
    ...SHADOWS.md,
  },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  categoryBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: SPACING.md, 
    paddingVertical: SPACING.xs, 
    borderRadius: RADIUS.full,
  },
  categoryText: { fontSize: FONT_SIZES.xs, fontWeight: '700' },
  noteActions: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: { 
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteContent: { fontSize: FONT_SIZES.md, color: COLORS.textPrimary, lineHeight: 22 },
  noteMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  noteAuthor: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontStyle: 'italic' },
  noteDate: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted },
  editHint: { alignItems: 'flex-end', marginTop: SPACING.xs },
  editHintText: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, fontStyle: 'italic' },
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: SPACING.xl, 
    paddingVertical: SPACING.lg, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  modalTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  cancelText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  saveText: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '700' },
  modalBody: { padding: SPACING.xl },
  formLabel: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  categoryGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: SPACING.sm, 
    marginBottom: SPACING.lg,
  },
  catChip: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md, 
    paddingVertical: SPACING.sm, 
    borderRadius: RADIUS.lg, 
    backgroundColor: COLORS.surface, 
    borderWidth: 2, 
    borderColor: COLORS.border,
    gap: 6,
    ...SHADOWS.sm,
  },
  catChipText: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.textSecondary },
  textArea: { 
    backgroundColor: COLORS.surface, 
    borderRadius: RADIUS.xl, 
    borderWidth: 1.5, 
    borderColor: COLORS.border, 
    padding: SPACING.lg, 
    fontSize: FONT_SIZES.md, 
    color: COLORS.textPrimary, 
    minHeight: 150,
    ...SHADOWS.sm,
  },
  
  // Voice recording styles
  noteLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  voiceBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.secondary, 
    paddingHorizontal: SPACING.md, 
    paddingVertical: SPACING.sm, 
    borderRadius: RADIUS.full,
    gap: 6,
    ...SHADOWS.sm,
  },
  voiceBtnRecording: { 
    backgroundColor: COLORS.error,
  },
  voiceBtnTranscribing: { 
    backgroundColor: COLORS.info,
  },
  voiceBtnText: { 
    color: COLORS.white, 
    fontSize: FONT_SIZES.xs, 
    fontWeight: '700',
  },
  recordingIndicator: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.errorLight,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
  recordingDot: { 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    backgroundColor: COLORS.error,
    marginRight: SPACING.sm,
  },
  recordingText: { 
    fontSize: FONT_SIZES.sm, 
    color: COLORS.error,
    fontWeight: '600',
  },
  transcribingIndicator: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.infoLight,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.info + '30',
  },
  transcribingText: { 
    fontSize: FONT_SIZES.sm, 
    color: COLORS.info,
    fontWeight: '600',
  },
  voiceHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.secondaryLight,
    borderRadius: RADIUS.lg,
    gap: 8,
  },
  voiceHintText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.secondary,
    flex: 1,
    fontWeight: '500',
  },
  // Success screen styles
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  successIcon: {
    marginBottom: SPACING.xl,
  },
  successTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  successSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xxl,
  },
  successButtons: {
    width: '100%',
    gap: SPACING.md,
  },
  addAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.xl,
    gap: SPACING.sm,
  },
  addAnotherText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  doneBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
  },
  doneBtnText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.white,
  },
});
