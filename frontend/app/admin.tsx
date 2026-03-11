import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Platform, ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function AdminScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
      } else {
        setError('Falsches Passwort');
      }
    } catch {
      setError('Verbindungsfehler');
    }
    setLoading(false);
  };

  if (token) {
    const adminUrl = `${API_URL}/api/admin-app?token=${token}`;

    if (Platform.OS === 'web') {
      return (
        <SafeAreaView style={s.container}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="#94A3B8" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Admin</Text>
          </View>
          <iframe
            src={adminUrl}
            style={{ flex: 1, width: '100%', height: '100%', border: 'none' } as any}
          />
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#94A3B8" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Admin</Text>
        </View>
        <WebView
          source={{ uri: adminUrl }}
          style={{ flex: 1 }}
          startInLoadingState
          renderLoading={() => (
            <View style={s.webviewLoading}>
              <ActivityIndicator size="large" color="#4A8B71" />
            </View>
          )}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#94A3B8" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Admin</Text>
      </View>
      <View style={s.loginBox}>
        <MaterialCommunityIcons name="shield-lock-outline" size={32} color="#4A8B71" />
        <TextInput
          style={s.input}
          placeholder="Passwort"
          placeholderTextColor="#64748B"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={login}
        />
        {error ? <Text style={s.error}>{error}</Text> : null}
        <TouchableOpacity style={s.loginBtn} onPress={login} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#FFF" size="small" />
            : <Text style={s.loginBtnText}>Anmelden</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1E293B',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#E2E8F0' },
  loginBox: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, gap: 16,
  },
  input: {
    width: '100%', maxWidth: 300,
    backgroundColor: '#1E293B', color: '#E2E8F0',
    borderRadius: 10, padding: 14, fontSize: 15,
    borderWidth: 1, borderColor: '#334155', textAlign: 'center',
  },
  error: { color: '#EF4444', fontSize: 13 },
  loginBtn: {
    backgroundColor: '#4A8B71', borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 32,
  },
  loginBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  webviewLoading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A',
  },
});
