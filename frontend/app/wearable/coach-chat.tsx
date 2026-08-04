import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const STORAGE_SESSION = 'vg_coach_chat_session';

interface Msg { role: 'user' | 'assistant'; content: string; ts: string }

const SUGGESTIONS = [
  'Warum ist mein Readiness heute so?',
  'Wie kann ich meine HRV verbessern?',
  'Sollte ich heute Sport machen?',
  'Was hilft bei schlechtem Schlaf?',
];

export default function CoachChat() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    (async () => {
      const uid = (await AsyncStorage.getItem('health_profile_id')) || 'anonymous';
      setUserId(uid);
      const saved = await AsyncStorage.getItem(STORAGE_SESSION);
      if (saved) {
        setSessionId(saved);
        try {
          const res = await fetch(`${API_URL}/api/coach-chat/history/${saved}`);
          const data = await res.json();
          setMessages(data.messages || []);
        } catch {}
      }
    })();
  }, []);

  const startNewSession = useCallback(async () => {
    setMessages([]);
    try {
      const res = await fetch(`${API_URL}/api/coach-chat/sessions?profile_id=${userId}`, { method: 'POST' });
      const data = await res.json();
      setSessionId(data.session_id);
      await AsyncStorage.setItem(STORAGE_SESSION, data.session_id);
    } catch {}
  }, [userId]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;
    const userMsg: Msg = { role: 'user', content: text, ts: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      const res = await fetch(`${API_URL}/api/coach-chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: userId, session_id: sessionId, message: text }),
      });
      const data = await res.json();
      if (data.session_id && data.session_id !== sessionId) {
        setSessionId(data.session_id);
        await AsyncStorage.setItem(STORAGE_SESSION, data.session_id);
      }
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant', ts: new Date().toISOString(),
        content: 'Entschuldige, ich kann gerade nicht antworten. Bitte versuche es gleich noch einmal.',
      }]);
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [userId, sessionId, sending]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="coach-chat-back">
          <MaterialCommunityIcons name="chevron-left" size={26} color="#1A2E35" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.avatarSmall}>
            <MaterialCommunityIcons name="robot-happy" size={16} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.headerTitle}>VERO</Text>
            <Text style={styles.headerSub}>dein VitaGuide Coach</Text>
          </View>
        </View>
        <TouchableOpacity onPress={startNewSession} style={styles.iconBtn} testID="coach-chat-new-session">
          <MaterialCommunityIcons name="refresh" size={22} color="#C2272F" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[styles.messages, { paddingBottom: 20 }]}
          testID="coach-chat-messages"
        >
          {messages.length === 0 && (
            <View style={styles.introCard} testID="coach-chat-intro">
              <View style={styles.avatarBig}>
                <MaterialCommunityIcons name="robot-happy" size={26} color="#FFFFFF" />
              </View>
              <Text style={styles.introTitle}>Hi, ich bin VERO 👋</Text>
              <Text style={styles.introText}>
                Frag mich alles zu Schlaf, Erholung, Stress oder Ernaehrung. Ich sehe deine Wearable‑Werte
                und kann dir dazu persoenliche Tipps geben.
              </Text>
              <Text style={styles.suggestionsTitle}>Vorschlaege:</Text>
              {SUGGESTIONS.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.suggestion}
                  onPress={() => send(s)}
                  testID={`coach-suggestion-${i}`}
                >
                  <MaterialCommunityIcons name="lightning-bolt" size={14} color="#C2272F" />
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {messages.map((m, i) => (
            <View
              key={i}
              style={[styles.bubbleRow, m.role === 'user' ? styles.bubbleRowUser : styles.bubbleRowBot]}
              testID={`coach-msg-${m.role}-${i}`}
            >
              {m.role === 'assistant' && (
                <View style={styles.avatarSmall}>
                  <MaterialCommunityIcons name="robot-happy" size={14} color="#FFFFFF" />
                </View>
              )}
              <View style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
                <Text style={[styles.bubbleText, m.role === 'user' && styles.bubbleTextUser]}>{m.content}</Text>
              </View>
            </View>
          ))}

          {sending && (
            <View style={[styles.bubbleRow, styles.bubbleRowBot]}>
              <View style={styles.avatarSmall}>
                <MaterialCommunityIcons name="robot-happy" size={14} color="#FFFFFF" />
              </View>
              <View style={[styles.bubble, styles.bubbleBot, { flexDirection: 'row', gap: 8, alignItems: 'center' }]}>
                <ActivityIndicator size="small" color="#C2272F" />
                <Text style={styles.typingText}>VERO tippt …</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputBar, { paddingBottom: 8 + insets.bottom }]}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Frag VERO etwas …"
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={2000}
            editable={!sending}
            testID="coach-chat-input"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (sending || !input.trim()) && styles.sendBtnDisabled]}
            onPress={() => send(input)}
            disabled={sending || !input.trim()}
            testID="coach-chat-send"
          >
            <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF9' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  iconBtn: { padding: 4 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 15, fontWeight: '800', color: '#1A2E35' },
  headerSub: { fontSize: 11, color: '#6B7280' },
  avatarBig: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#C2272F', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarSmall: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#C2272F', alignItems: 'center', justifyContent: 'center' },

  messages: { padding: 16 },
  introCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center',
  },
  introTitle: { fontSize: 20, fontWeight: '800', color: '#1A2E35', marginBottom: 6 },
  introText: { fontSize: 13, color: '#4B5563', textAlign: 'center', lineHeight: 19, marginBottom: 18 },
  suggestionsTitle: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', color: '#6B7280', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  suggestion: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 8, alignSelf: 'stretch',
    borderWidth: 1, borderColor: '#FECACA',
  },
  suggestionText: { flex: 1, fontSize: 13, color: '#7F1D1D', fontWeight: '600' },

  bubbleRow: { flexDirection: 'row', gap: 8, marginBottom: 10, maxWidth: '85%' },
  bubbleRowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  bubbleRowBot: { alignSelf: 'flex-start' },
  bubble: { padding: 12, borderRadius: 14 },
  bubbleUser: { backgroundColor: '#C2272F', borderTopRightRadius: 4 },
  bubbleBot: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  bubbleText: { fontSize: 14, color: '#1A2E35', lineHeight: 20 },
  bubbleTextUser: { color: '#FFFFFF' },
  typingText: { fontSize: 12, color: '#6B7280', fontStyle: 'italic' },

  inputBar: {
    flexDirection: 'row', gap: 8, padding: 12,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F3F4F6',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1, maxHeight: 120,
    backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#1A2E35',
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#C2272F', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#D1D5DB' },
});
