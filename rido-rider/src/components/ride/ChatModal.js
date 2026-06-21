import React, { useState, useEffect, useRef } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

export default function ChatModal({ visible, onClose, userName }) {
  const { colors, spacing, typography, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([
    { id: '1', text: 'Hi! I am on my way to your location.', sender: 'other', time: '12:01 PM' },
  ]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef(null);

  const quickReplies = [
    'I am waiting here.',
    'Okay, thanks!',
    'Where exactly are you?',
    'On my way out.',
  ];

  const handleSend = (text) => {
    if (!text.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg = {
      id: String(Date.now()),
      text: text.trim(),
      sender: 'me',
      time,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText('');

    // Trigger mock response after 1.5 seconds
    setTimeout(() => {
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const driverReplies = [
        'Okay, got it!',
        'Arriving in 2 mins, please stay near the gate.',
        'Sure, see you soon.',
        'I am just crossing the junction, will be there in a minute.',
      ];
      const randomReply = driverReplies[Math.floor(Math.random() * driverReplies.length)];
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          text: randomReply,
          sender: 'other',
          time: replyTime,
        },
      ]);
    }, 1500);
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
          <Pressable style={styles.backBtn} onPress={onClose}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              {userName || 'Driver'}
            </Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Active Ride Chat</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Message Thread */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.base, gap: spacing.sm }}
          renderItem={({ item }) => {
            const isMe = item.sender === 'me';
            return (
              <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
                <View
                  style={[
                    styles.bubble,
                    {
                      backgroundColor: isMe ? colors.primary : colors.surfaceSecondary,
                      borderRadius: 16,
                      padding: spacing.md,
                    },
                    isMe ? styles.bubbleMe : styles.bubbleOther,
                  ]}
                >
                  <Text style={[styles.messageText, { color: isMe ? '#FFF' : colors.textPrimary, fontFamily: typography.fontFamily.regular }]}>
                    {item.text}
                  </Text>
                  <Text style={[styles.time, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.textMuted, fontFamily: typography.fontFamily.regular }]}>
                    {item.time}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        {/* Quick Replies Row */}
        <View style={styles.quickRepliesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.base, gap: spacing.sm }}>
            {quickReplies.map((r, i) => (
              <Pressable
                key={i}
                style={[styles.quickReplyBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => handleSend(r)}
              >
                <Text style={[styles.quickReplyText, { color: colors.textSecondary, fontFamily: typography.fontFamily.medium }]}>
                  {r}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Input Bar */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + spacing.sm }]}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceSecondary,
                  color: colors.textPrimary,
                  fontFamily: typography.fontFamily.regular,
                  borderColor: colors.border
                }
              ]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Send message..."
              placeholderTextColor={colors.textMuted}
            />
            <Pressable
              style={[styles.sendBtn, { backgroundColor: colors.primary }]}
              onPress={() => handleSend(inputText)}
            >
              <Ionicons name="send" size={18} color="#FFF" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerName: {
    fontSize: 16,
  },
  headerSub: {
    fontSize: 11,
    marginTop: 2,
  },
  messageRow: {
    flexDirection: 'row',
    width: '100%',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    position: 'relative',
  },
  bubbleMe: {
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  time: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  quickRepliesContainer: {
    paddingVertical: 8,
  },
  quickReplyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickReplyText: {
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
