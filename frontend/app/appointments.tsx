import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Modal, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';

export default function AppointmentsScreen() {
  const { selectedRecipientId } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', time: '', doctor_name: '', location: '', appointment_type: '', notes: '' });
  const [saving, setSaving] = useState(false);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState('');
  
  // Audio recorder hook
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const load = useCallback(async () => {
    if (!selectedRecipientId) { setLoading(false); return; }
    try { setItems(await api.get(`/care-recipients/${selectedRecipientId}/appointments`)); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }, [selectedRecipientId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const startRecording = async () => {
    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
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
        const response = await fetch(uri);
        const blob = await response.blob();
        
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const result = await api.post('/transcribe', {
          audio_base64: base64,
          language: 'en',
        });

        if (result.success && result.text) {
          setTranscript(result.text);
          // Append to notes
          setForm(prev => ({
            ...prev,
            notes: prev.notes ? prev.notes + '\n\n--- Recording ---\n' + result.text : result.text
          }));
        }
      }
    } catch (err: any) {
      console.error('Transcription error:', err);
      Alert.alert('Transcription Failed', err.message || 'Could not transcribe audio');
    } finally {
      setIsTranscribing(false);
      await setAudioModeAsync({ allowsRecording: false });
    }
  };

  const handleSummarize = async () => {
    if (!transcript.trim()) {
      Alert.alert('No Recording', 'Please record the appointment first before summarizing.');
      return;
    }
    
    setIsSummarizing(true);
    try {
      const result = await api.post('/ai/summarize-appointment', {
        transcript: transcript,
        appointment_title: form.title || 'Doctor Appointment'
      });
      
      if (result.success && result.summary) {
        setSummary(result.summary);
        setShowSummary(true);
      }
    } catch (err: any) {
      console.error('Summarization error:', err);
      Alert.alert('Summarization Failed', err.message || 'Could not summarize the recording');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleAdd = async () => {
    if (!form.title.trim() || !form.date.trim()) { Alert.alert('Required', 'Title and date are required'); return; }
    setSaving(true);
    try { 
      await api.post(`/care-recipients/${selectedRecipientId}/appointments`, form); 
      setShowAdd(false); 
      setForm({ title: '', date: '', time: '', doctor_name: '', location: '', appointment_type: '', notes: '' }); 
      setTranscript('');
      await load(); 
    }
    catch (e: any) { Alert.alert('Error', e.message); } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity testID="back-appts" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
        <Text style={s.title}>Appointments</Text>
        <TouchableOpacity testID="add-appt-btn" onPress={() => setShowAdd(true)}><Ionicons name="add-circle" size={28} color={COLORS.primary} /></TouchableOpacity>
      </View>
      
      {/* Pro Tip Section */}
      <View style={s.tipContainer}>
        <View style={s.tipHeader}>
          <Ionicons name="bulb" size={20} color={COLORS.warning} />
          <Text style={s.tipTitle}>Pro Tip</Text>
        </View>
        <Text style={s.tipText}>
          Record your doctor appointments! Tap the microphone when adding an appointment to capture what the doctor says. 
          Then use AI to summarize key points like medications, instructions, and follow-ups.
        </Text>
      </View>
      
      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={COLORS.primary} />}>
        {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} /> :
          items.length === 0 ? (
            <View style={s.empty}><Ionicons name="calendar-outline" size={48} color={COLORS.primaryLight} /><Text style={s.emptyTitle}>No appointments</Text></View>
          ) : items.map(a => (
            <View key={a.appointment_id} style={s.card}>
              <View style={s.row}>
                <View style={s.dateBox}><Ionicons name="calendar" size={20} color={COLORS.primary} /><Text style={s.dateText}>{a.date}</Text></View>
                <TouchableOpacity testID={`del-appt-${a.appointment_id}`} onPress={async () => { await api.del(`/care-recipients/${selectedRecipientId}/appointments/${a.appointment_id}`); load(); }}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.error} /></TouchableOpacity>
              </View>
              <Text style={s.cardTitle}>{a.title}</Text>
              {a.time && <Text style={s.cardSub}><Ionicons name="time-outline" size={14} /> {a.time}</Text>}
              {a.doctor_name && <Text style={s.cardSub}><Ionicons name="person-outline" size={14} /> Dr. {a.doctor_name}</Text>}
              {a.location && <Text style={s.cardSub}><Ionicons name="location-outline" size={14} /> {a.location}</Text>}
              {a.notes && <Text style={s.cardNotes} numberOfLines={3}>{a.notes}</Text>}
            </View>
          ))}
      </ScrollView>
      
      {/* Add Appointment Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.mHeader}>
            <TouchableOpacity onPress={() => { setShowAdd(false); setTranscript(''); }}><Text style={s.cancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.mTitle}>Add Appointment</Text>
            <TouchableOpacity testID="save-appt-btn" onPress={handleAdd} disabled={saving}>{saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={s.save}>Save</Text>}</TouchableOpacity>
          </View>
          <ScrollView style={s.mBody} keyboardShouldPersistTaps="handled">
            {/* Voice Recording Tip */}
            <View style={s.recordingTip}>
              <Ionicons name="mic" size={18} color={COLORS.secondary} />
              <Text style={s.recordingTipText}>
                Record your appointment below and let AI summarize the key points!
              </Text>
            </View>
            
            {[{ k: 'title', l: 'Title *', p: 'e.g., Cardiology checkup' },{ k: 'date', l: 'Date *', p: 'YYYY-MM-DD' },{ k: 'time', l: 'Time', p: 'e.g., 10:00 AM' },{ k: 'doctor_name', l: 'Doctor', p: 'Doctor name' },{ k: 'location', l: 'Location', p: 'Clinic address' },{ k: 'appointment_type', l: 'Type', p: 'e.g., Follow-up' }].map(({ k, l, p }) => (
              <View key={k} style={s.fg}><Text style={s.fl}>{l}</Text><TextInput testID={`appt-${k}`} style={s.fi} placeholder={p} placeholderTextColor={COLORS.border} value={(form as any)[k]} onChangeText={v => setForm({ ...form, [k]: v })} /></View>))}
            
            {/* Voice Recording Section */}
            <View style={s.voiceSection}>
              <View style={s.voiceSectionHeader}>
                <Text style={s.fl}>Record Appointment</Text>
                <View style={s.voiceButtons}>
                  <TouchableOpacity 
                    testID="voice-record-btn"
                    style={[s.voiceBtn, isRecording && s.voiceBtnRecording]}
                    onPress={isRecording ? stopRecording : startRecording}
                    disabled={isTranscribing}
                  >
                    {isTranscribing ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <>
                        <Ionicons name={isRecording ? "stop" : "mic"} size={16} color={COLORS.white} />
                        <Text style={s.voiceBtnText}>{isRecording ? 'Stop' : 'Record'}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                  {transcript && (
                    <TouchableOpacity 
                      testID="summarize-btn"
                      style={s.summarizeBtn}
                      onPress={handleSummarize}
                      disabled={isSummarizing}
                    >
                      {isSummarizing ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <>
                          <Ionicons name="sparkles" size={16} color={COLORS.white} />
                          <Text style={s.voiceBtnText}>AI Summary</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              {isRecording && (
                <View style={s.recordingIndicator}>
                  <View style={s.recordingDot} />
                  <Text style={s.recordingText}>Recording... Tap "Stop" when finished</Text>
                </View>
              )}
              
              {isTranscribing && (
                <View style={s.transcribingIndicator}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={s.transcribingText}>Converting speech to text...</Text>
                </View>
              )}
            </View>
            
            {/* Notes/Transcript */}
            <View style={s.fg}>
              <Text style={s.fl}>Notes & Recording Transcript</Text>
              <TextInput 
                testID="appt-notes" 
                style={[s.fi, s.textArea]} 
                placeholder="Doctor's instructions, your questions, recording transcript..." 
                placeholderTextColor={COLORS.border} 
                value={form.notes} 
                onChangeText={v => setForm({ ...form, notes: v })} 
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      
      {/* AI Summary Modal */}
      <Modal visible={showSummary} animationType="slide" transparent>
        <View style={s.summaryOverlay}>
          <View style={s.summaryModal}>
            <View style={s.summaryHeader}>
              <View style={s.summaryTitleRow}>
                <Ionicons name="sparkles" size={24} color={COLORS.secondary} />
                <Text style={s.summaryTitle}>AI Summary</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSummary(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.summaryContent}>
              <Text style={s.summaryText}>{summary}</Text>
            </ScrollView>
            <TouchableOpacity 
              style={s.addToNotesBtn}
              onPress={() => {
                setForm(prev => ({
                  ...prev,
                  notes: prev.notes + '\n\n--- AI Summary ---\n' + summary
                }));
                setShowSummary(false);
              }}
            >
              <Ionicons name="add" size={20} color={COLORS.white} />
              <Text style={s.addToNotesBtnText}>Add Summary to Notes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  title: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.textPrimary },
  
  // Tip section styles
  tipContainer: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.warning + '15',
    borderRadius: RADIUS.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  tipTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.warning,
    marginLeft: SPACING.xs,
  },
  tipText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  card: { marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateBox: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: '600', marginLeft: 4 },
  cardTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary, marginTop: 4 },
  cardSub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  cardNotes: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: SPACING.sm, fontStyle: 'italic', backgroundColor: COLORS.background, padding: SPACING.sm, borderRadius: RADIUS.md },
  
  modal: { flex: 1, backgroundColor: COLORS.background },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  mTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  cancel: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  save: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '700' },
  mBody: { padding: SPACING.lg },
  
  // Recording tip in modal
  recordingTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary + '15',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    gap: 8,
  },
  recordingTipText: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  
  fg: { marginBottom: SPACING.md }, 
  fl: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  fi: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: SPACING.md, height: 48, fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
  textArea: { height: 120, paddingTop: SPACING.md, textAlignVertical: 'top' },
  
  // Voice section styles
  voiceSection: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  voiceSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voiceButtons: {
    flexDirection: 'row',
    gap: 8,
  },
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
  voiceBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  summarizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.info,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '15',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
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
    marginTop: SPACING.sm,
    gap: 8,
  },
  transcribingText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.info,
    fontWeight: '600',
  },
  
  // Summary modal styles
  summaryOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  summaryModal: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '80%',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  summaryContent: {
    padding: SPACING.lg,
    maxHeight: 400,
  },
  summaryText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  addToNotesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    margin: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: 8,
  },
  addToNotesBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
});
