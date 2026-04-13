import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Modal, Alert, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';
import AppointmentCard from '../src/components/appointments/AppointmentCard';
import AISummaryModalContent from '../src/components/appointments/AISummaryModal';

// Appointment categories
const CATEGORIES = [
  { id: 'doctor', label: 'Doctor', icon: 'medkit', color: COLORS.primary },
  { id: 'psw', label: 'PSW', icon: 'person', color: COLORS.secondary },
  { id: 'grooming', label: 'Grooming', icon: 'cut', color: '#9C27B0' },
  { id: 'footcare', label: 'Foot Care', icon: 'footsteps', color: '#FF9800' },
  { id: 'respite', label: 'Respite', icon: 'home', color: '#4CAF50' },
  { id: 'therapy', label: 'Therapy', icon: 'fitness', color: '#00BCD4' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal', color: COLORS.textSecondary },
];

// Repeat frequency options
const REPEAT_OPTIONS = [
  { id: 'daily', label: 'Daily', icon: 'today' },
  { id: 'weekly', label: 'Weekly', icon: 'calendar' },
  { id: 'monthly', label: 'Monthly', icon: 'calendar-outline' },
];

export default function AppointmentsScreen() {
  const { selectedRecipientId } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingAppt, setEditingAppt] = useState<any>(null);
  const [form, setForm] = useState({ 
    title: '', date: '', time: '', doctor_name: '', location: '', 
    appointment_type: '', category: '', notes: '', 
    blood_pressure: '', weight: '',
    repeats: false, repeat_frequency: ''
  });
  const [saving, setSaving] = useState(false);
  
  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
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

  const openAddModal = () => {
    setEditingAppt(null);
    const today = new Date();
    setSelectedDate(today);
    setForm({ title: '', date: today.toISOString().split('T')[0], time: '', doctor_name: '', location: '', appointment_type: '', category: '', notes: '', blood_pressure: '', weight: '', repeats: false, repeat_frequency: '' });
    setTranscript('');
    setShowAdd(true);
  };

  const openEditModal = (appt: any) => {
    setEditingAppt(appt);
    const apptDate = appt.date ? new Date(appt.date) : new Date();
    setSelectedDate(apptDate);
    setForm({
      title: appt.title || '',
      date: appt.date || '',
      time: appt.time || '',
      doctor_name: appt.doctor_name || '',
      location: appt.location || '',
      appointment_type: appt.appointment_type || '',
      category: appt.category || '',
      notes: appt.notes || '',
      blood_pressure: appt.blood_pressure || '',
      weight: appt.weight || '',
      repeats: appt.repeats || false,
      repeat_frequency: appt.repeat_frequency || '',
    });
    setTranscript('');
    setShowAdd(true);
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
      setForm({ ...form, date: date.toISOString().split('T')[0] });
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'Select Date';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

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

  const handleSave = async () => {
    if (!form.title.trim() || !form.date.trim()) { Alert.alert('Required', 'Title and date are required'); return; }
    setSaving(true);
    try { 
      if (editingAppt) {
        await api.put(`/care-recipients/${selectedRecipientId}/appointments/${editingAppt.appointment_id}`, form);
        Alert.alert('Updated', 'Appointment updated successfully');
      } else {
        await api.post(`/care-recipients/${selectedRecipientId}/appointments`, form); 
      }
      setShowAdd(false); 
      setEditingAppt(null);
      setForm({ title: '', date: '', time: '', doctor_name: '', location: '', appointment_type: '', category: '', notes: '', blood_pressure: '', weight: '', repeats: false, repeat_frequency: '' }); 
      setTranscript('');
      await load(); 
    }
    catch (e: any) { Alert.alert('Error', e.message); } finally { setSaving(false); }
  };

  const handleDelete = async (apptId: string, title: string) => {
    Alert.alert(
      'Delete Appointment',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try { 
              await api.del(`/care-recipients/${selectedRecipientId}/appointments/${apptId}`); 
              await load(); 
            }
            catch (e: any) { Alert.alert('Error', e.message); }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity testID="back-appts" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
        <Text style={s.title}>Appointments</Text>
        <TouchableOpacity testID="add-appt-btn" onPress={openAddModal}><Ionicons name="add-circle" size={28} color={COLORS.primary} /></TouchableOpacity>
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
              <AppointmentCard
                key={a.appointment_id}
                appointment={a}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ))}
      </ScrollView>
      
      {/* Add/Edit Appointment Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.mHeader}>
            <TouchableOpacity onPress={() => { setShowAdd(false); setEditingAppt(null); setTranscript(''); }}><Text style={s.cancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.mTitle}>{editingAppt ? 'Edit Appointment' : 'Add Appointment'}</Text>
            <TouchableOpacity testID="save-appt-btn" onPress={handleSave} disabled={saving}>{saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={s.save}>Save</Text>}</TouchableOpacity>
          </View>
          <ScrollView style={s.mBody} keyboardShouldPersistTaps="handled">
            {/* Voice Recording Tip */}
            <View style={s.recordingTip}>
              <Ionicons name="mic" size={18} color={COLORS.secondary} />
              <Text style={s.recordingTipText}>
                Record your appointment below and let AI summarize the key points!
              </Text>
            </View>
            
            {/* Category Selector */}
            <View style={s.fg}>
              <Text style={s.fl}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.categoryScroll}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity 
                    key={cat.id}
                    style={[s.categoryOption, form.category === cat.id && { backgroundColor: cat.color + '20', borderColor: cat.color }]}
                    onPress={() => setForm({ ...form, category: cat.id })}
                  >
                    <Ionicons name={cat.icon as any} size={18} color={form.category === cat.id ? cat.color : COLORS.textSecondary} />
                    <Text style={[s.categoryOptionText, form.category === cat.id && { color: cat.color }]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            {[{ k: 'title', l: 'Title *', p: 'e.g., Cardiology checkup' },{ k: 'time', l: 'Time', p: 'e.g., 10:00 AM' },{ k: 'doctor_name', l: 'Doctor/Provider', p: 'Name of doctor or provider' },{ k: 'location', l: 'Location', p: 'Clinic address' }].map(({ k, l, p }) => (
              <View key={k} style={s.fg}><Text style={s.fl}>{l}</Text><TextInput testID={`appt-${k}`} style={s.fi} placeholder={p} placeholderTextColor={COLORS.border} value={(form as any)[k]} onChangeText={v => setForm({ ...form, [k]: v })} /></View>))}
            
            {/* Date Picker Section */}
            <View style={s.fg}>
              <Text style={s.fl}>Date *</Text>
              <TouchableOpacity 
                testID="date-picker-btn"
                style={s.datePickerBtn}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={20} color={COLORS.primary} />
                <Text style={[s.datePickerText, !form.date && { color: COLORS.border }]}>
                  {formatDisplayDate(form.date)}
                </Text>
                <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {/* Date Picker - Platform specific */}
            {showDatePicker && Platform.OS === 'ios' && (
              <Modal transparent animationType="slide">
                <View style={s.datePickerOverlay}>
                  <View style={s.datePickerModal}>
                    <View style={s.datePickerHeader}>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={s.datePickerCancel}>Cancel</Text>
                      </TouchableOpacity>
                      <Text style={s.datePickerTitle}>Select Date</Text>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={s.datePickerDone}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display="spinner"
                      onChange={handleDateChange}
                      style={{ height: 200 }}
                    />
                  </View>
                </View>
              </Modal>
            )}
            
            {showDatePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}
            
            {/* Web fallback - simple date input */}
            {showDatePicker && Platform.OS === 'web' && (
              <Modal transparent animationType="fade">
                <View style={s.datePickerOverlay}>
                  <View style={s.datePickerModal}>
                    <View style={s.datePickerHeader}>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={s.datePickerCancel}>Cancel</Text>
                      </TouchableOpacity>
                      <Text style={s.datePickerTitle}>Select Date</Text>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={s.datePickerDone}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ padding: SPACING.lg, alignItems: 'center' }}>
                      <TextInput
                        style={[s.fi, { width: '100%', textAlign: 'center' }]}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={COLORS.border}
                        value={form.date}
                        onChangeText={(text) => {
                          setForm({ ...form, date: text });
                          // Try to parse the date
                          const parsed = new Date(text);
                          if (!isNaN(parsed.getTime())) {
                            setSelectedDate(parsed);
                          }
                        }}
                      />
                      <Text style={{ marginTop: SPACING.md, color: COLORS.textSecondary, fontSize: FONT_SIZES.xs }}>
                        Enter date in YYYY-MM-DD format (e.g., 2026-03-20)
                      </Text>
                    </View>
                  </View>
                </View>
              </Modal>
            )}
            {/* Vitals Section */}
            <View style={s.vitalsSection}>
              <Text style={s.sectionTitle}>Vitals (Optional)</Text>
              <Text style={s.sectionSubtitle}>Record blood pressure and weight from this appointment</Text>
              <View style={s.vitalsInputRow}>
                <View style={s.vitalInputGroup}>
                  <Text style={s.fl}>Blood Pressure</Text>
                  <TextInput 
                    testID="appt-blood_pressure"
                    style={s.fi} 
                    placeholder="e.g., 120/80" 
                    placeholderTextColor={COLORS.border} 
                    value={form.blood_pressure} 
                    onChangeText={v => setForm({ ...form, blood_pressure: v })} 
                  />
                </View>
                <View style={s.vitalInputGroup}>
                  <Text style={s.fl}>Weight</Text>
                  <TextInput 
                    testID="appt-weight"
                    style={s.fi} 
                    placeholder="e.g., 150 lbs" 
                    placeholderTextColor={COLORS.border} 
                    value={form.weight} 
                    onChangeText={v => setForm({ ...form, weight: v })} 
                  />
                </View>
              </View>
            </View>
            
            {/* Repeat Section */}
            <View style={s.repeatSection}>
              <TouchableOpacity 
                style={s.repeatToggle}
                onPress={() => setForm({ ...form, repeats: !form.repeats, repeat_frequency: form.repeats ? '' : form.repeat_frequency })}
              >
                <Ionicons 
                  name={form.repeats ? 'checkbox' : 'square-outline'} 
                  size={24} 
                  color={form.repeats ? COLORS.info : COLORS.border} 
                />
                <View style={s.repeatToggleText}>
                  <Text style={s.sectionTitle}>Recurring Appointment</Text>
                  <Text style={s.sectionSubtitle}>This appointment repeats on a schedule</Text>
                </View>
              </TouchableOpacity>
              
              {form.repeats && (
                <View style={s.repeatOptions}>
                  {REPEAT_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.id}
                      style={[s.repeatOption, form.repeat_frequency === opt.id && s.repeatOptionActive]}
                      onPress={() => setForm({ ...form, repeat_frequency: opt.id })}
                    >
                      <Ionicons 
                        name={opt.icon as any} 
                        size={20} 
                        color={form.repeat_frequency === opt.id ? COLORS.info : COLORS.textSecondary} 
                      />
                      <Text style={[s.repeatOptionText, form.repeat_frequency === opt.id && s.repeatOptionTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            
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
        <AISummaryModalContent
          summary={summary}
          onClose={() => setShowSummary(false)}
          onAddToNotes={() => {
            setForm(prev => ({
              ...prev,
              notes: prev.notes + '\n\n--- AI Summary ---\n' + summary
            }));
            setShowSummary(false);
          }}
        />
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
  
  // Category selector styles
  categoryScroll: {
    flexGrow: 0,
    marginTop: SPACING.xs,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 6,
  },
  categoryOptionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  
  // Vitals section in modal
  vitalsSection: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  vitalsInputRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  vitalInputGroup: {
    flex: 1,
  },
  
  // Repeat section in modal
  repeatSection: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  repeatToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  repeatToggleText: {
    flex: 1,
  },
  repeatOptions: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  repeatOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    gap: 4,
  },
  repeatOptionActive: {
    borderColor: COLORS.info,
    backgroundColor: COLORS.info + '15',
  },
  repeatOptionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  repeatOptionTextActive: {
    color: COLORS.info,
  },
  
  fg: { marginBottom: SPACING.md }, 
  fl: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  fi: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: SPACING.md, height: 48, fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
  textArea: { height: 120, paddingTop: SPACING.md, textAlignVertical: 'top' },
  
  // Date picker styles
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 48,
    gap: SPACING.sm,
  },
  datePickerText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModal: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingBottom: SPACING.xl,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  datePickerTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  datePickerCancel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  datePickerDone: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '700',
  },
  
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
});
