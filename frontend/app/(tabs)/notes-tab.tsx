import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Modal, Alert, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../src/constants/theme';

const CATEGORIES = ['general', 'medical', 'behavior', 'dietary', 'activity', 'mood'];

export default function NotesTab() {
  const { selectedRecipientId } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  // Audio recorder hook
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const loadNotes = useCallback(async () => {
    if (!selectedRecipientId) { setLoading(false); return; }
    try { setNotes(await api.get(`/care-recipients/${selectedRecipientId}/notes`)); }
    catch (e) { console.error(e); }
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
      console.error('Failed to start recording:', err);
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
      console.error('Transcription error:', err);
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
    setSaving(true);
    try {
      if (editingNote) {
        await api.put(`/care-recipients/${selectedRecipientId}/notes/${editingNote.note_id}`, { content, category });
        Alert.alert('Updated', 'Note updated successfully');
      } else {
        await api.post(`/care-recipients/${selectedRecipientId}/notes`, { content, category });
      }
      setShowAdd(false); 
      setEditingNote(null);
      setContent(''); 
      setCategory('general');
      await loadNotes();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
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
    const colors: Record<string, string> = { general: COLORS.info, medical: COLORS.error, behavior: COLORS.warning, dietary: COLORS.secondary, activity: COLORS.primary, mood: '#9B59B6' };
    return colors[cat] || COLORS.info;
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
        {['all', ...CATEGORIES].map(cat => (
          <TouchableOpacity key={cat} testID={`filter-${cat}`} style={[styles.filterChip, filter === cat && styles.filterActive]}
            onPress={() => setFilter(cat)}>
            <Text style={[styles.filterText, filter === cat && styles.filterTextActive]}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
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
                  <Text style={[styles.categoryText, { color: getCategoryColor(note.category) }]}>{note.category}</Text>
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
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowAdd(false); setEditingNote(null); setContent(''); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingNote ? 'Edit Note' : 'Add Note'}</Text>
            <TouchableOpacity testID="save-note-btn" onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.formLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity key={cat} testID={`cat-${cat}`} style={[styles.catChip, category === cat && { backgroundColor: getCategoryColor(cat) }]}
                  onPress={() => setCategory(cat)}>
                  <Text style={[styles.catChipText, category === cat && { color: COLORS.white }]}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
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
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  headerTitle: { fontSize: FONT_SIZES.xxl, fontWeight: '800', color: COLORS.textPrimary },
  addIconBtn: { padding: SPACING.xs },
  
  // Tip section styles
  tipContainer: {
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.warning + '15',
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
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
  
  filterScroll: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, maxHeight: 50 },
  filterChip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginRight: SPACING.sm },
  filterActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.white },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  emptyText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  noteCard: { 
    marginHorizontal: SPACING.lg, 
    marginBottom: SPACING.sm, 
    padding: SPACING.md, 
    backgroundColor: COLORS.surface, 
    borderRadius: RADIUS.lg, 
    shadowColor: COLORS.cardShadow, 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 1, 
    shadowRadius: 4, 
    elevation: 2 
  },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  categoryBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full },
  categoryText: { fontSize: FONT_SIZES.xs, fontWeight: '700' },
  noteActions: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: { padding: SPACING.xs, borderRadius: RADIUS.md },
  noteContent: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, lineHeight: 20 },
  noteMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.sm },
  noteAuthor: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontStyle: 'italic' },
  noteDate: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  editHint: { alignItems: 'flex-end', marginTop: SPACING.xs },
  editHintText: { fontSize: FONT_SIZES.xs, color: COLORS.border, fontStyle: 'italic' },
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  cancelText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  saveText: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '700' },
  modalBody: { padding: SPACING.lg },
  formLabel: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  catChip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginRight: SPACING.sm },
  catChipText: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.textSecondary },
  textArea: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, padding: SPACING.md, fontSize: FONT_SIZES.md, color: COLORS.textPrimary, minHeight: 150 },
  
  // Voice recording styles
  noteLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  voiceBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.secondary, 
    paddingHorizontal: SPACING.md, 
    paddingVertical: SPACING.xs, 
    borderRadius: RADIUS.full,
    gap: 4,
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
    backgroundColor: COLORS.error + '15',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  recordingDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: COLORS.error,
    marginRight: SPACING.sm,
  },
  recordingText: { 
    fontSize: FONT_SIZES.xs, 
    color: COLORS.error,
    fontWeight: '600',
  },
  transcribingIndicator: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.info + '15',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    gap: 8,
  },
  transcribingText: { 
    fontSize: FONT_SIZES.xs, 
    color: COLORS.info,
    fontWeight: '600',
  },
  voiceHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: 6,
  },
  voiceHintText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    flex: 1,
  },
});
