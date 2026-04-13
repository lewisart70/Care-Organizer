import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../src/constants/theme';

export default function ChatScreen() {
  const { selectedRecipientId, user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMessages = useCallback(async () => {
    if (!selectedRecipientId) { setLoading(false); return; }
    try {
      const msgs = await api.get(`/care-recipients/${selectedRecipientId}/chat`);
      setMessages(msgs);
    } catch (e) {  }
    finally { setLoading(false); }
  }, [selectedRecipientId]);

  useFocusEffect(useCallback(() => {
    loadMessages();
    pollRef.current = setInterval(loadMessages, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadMessages]));

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim() && !photo) return;
    setSending(true);
    try {
      await api.post(`/care-recipients/${selectedRecipientId}/chat`, { content: text.trim(), photo });
      setText('');
      setPhoto(null);
      await loadMessages();
    } catch (e: any) {  }
    finally { setSending(false); }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.sender_id === user?.user_id;
    return (
      <View style={[s.msgRow, isMe && s.msgRowMe]}>
        {!isMe && (
          <View style={s.msgAvatar}>
            <Text style={s.msgAvatarText}>{item.sender_name?.charAt(0)?.toUpperCase()}</Text>
          </View>
        )}
        <View style={[s.msgBubble, isMe ? s.msgBubbleMe : s.msgBubbleOther]}>
          {!isMe && <Text style={s.msgSender}>{item.sender_name}</Text>}
          {item.photo && (
            <Image source={{ uri: item.photo }} style={s.msgPhoto} resizeMode="cover" />
          )}
          {item.content ? <Text style={[s.msgText, isMe && s.msgTextMe]}>{item.content}</Text> : null}
          <Text style={[s.msgTime, isMe && s.msgTimeMe]}>
            {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
        </View>
      </View>
    );
  };

  if (!selectedRecipientId) {
    return <SafeAreaView style={s.container}><View style={s.centered}><Text style={s.emptyText}>Select a care recipient first</Text></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity testID="back-chat" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Care Team Chat</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={90}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
        ) : messages.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color={COLORS.primaryLight} />
            <Text style={s.emptyTitle}>No messages yet</Text>
            <Text style={s.emptyText}>Start chatting with your care team</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.message_id}
            renderItem={renderMessage}
            contentContainerStyle={s.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {photo && (
          <View style={s.photoPreview}>
            <Image source={{ uri: photo }} style={s.previewImg} />
            <TouchableOpacity testID="remove-chat-photo" onPress={() => setPhoto(null)} style={s.removePhoto}>
              <Ionicons name="close-circle" size={24} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        )}

        <View style={s.inputBar}>
          <TouchableOpacity testID="chat-pick-image" onPress={pickImage} style={s.attachBtn}>
            <Ionicons name="camera" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <TextInput
            testID="chat-input"
            style={s.chatInput}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.border}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity testID="chat-send-btn" onPress={handleSend} disabled={sending || (!text.trim() && !photo)} style={[s.sendBtn, (!text.trim() && !photo) && s.sendBtnDisabled]}>
            {sending ? <ActivityIndicator size="small" color={COLORS.white} /> : <Ionicons name="send" size={18} color={COLORS.white} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.textPrimary },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  emptyText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  messageList: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  msgRow: { flexDirection: 'row', marginBottom: SPACING.sm, alignItems: 'flex-end' },
  msgRowMe: { flexDirection: 'row-reverse' },
  msgAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.xs },
  msgAvatarText: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.white },
  msgBubble: { maxWidth: '75%', padding: SPACING.sm, borderRadius: RADIUS.lg },
  msgBubbleMe: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  msgBubbleOther: { backgroundColor: COLORS.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  msgSender: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.secondary, marginBottom: 2 },
  msgText: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, lineHeight: 20 },
  msgTextMe: { color: COLORS.white },
  msgTime: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2, alignSelf: 'flex-end' },
  msgTimeMe: { color: COLORS.primaryLight },
  msgPhoto: { width: 200, height: 150, borderRadius: RADIUS.md, marginBottom: SPACING.xs },
  photoPreview: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xs },
  previewImg: { width: 60, height: 60, borderRadius: RADIUS.md },
  removePhoto: { marginLeft: SPACING.sm },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  attachBtn: { padding: SPACING.sm, marginRight: SPACING.xs },
  chatInput: { flex: 1, backgroundColor: COLORS.background, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, maxHeight: 100, borderWidth: 1, borderColor: COLORS.border },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginLeft: SPACING.xs },
  sendBtnDisabled: { opacity: 0.4 },
});
