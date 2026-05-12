import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/AuthContext';
import { useLang } from '../src/LangContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const EMERGENT_AUTH_URL = 'https://auth.emergentagent.com/';

export default function LoginScreen() {
  const { login, register, googleAuth } = useAuth();
  const { lang } = useLang();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const t = useCallback((de: string, it: string) => lang === 'it' ? it : de, [lang]);

  const handleSubmit = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('Fehler', 'Errore'), t('Bitte E-Mail und Passwort eingeben', 'Inserisci email e password'));
      return;
    }
    setLoading(true);
    const result = mode === 'login'
      ? await login(email.trim(), password)
      : await register(email.trim(), password, firstName.trim() || undefined);

    setLoading(false);
    if (!result.success) {
      Alert.alert(t('Fehler', 'Errore'), result.error || t('Unbekannter Fehler', 'Errore sconosciuto'));
    }
    // If success, AuthContext updates and _layout will redirect
  }, [email, password, firstName, mode, login, register, t]);

  const handleGoogleLogin = useCallback(async () => {
    try {
      setGoogleLoading(true);
      // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
      const redirectUrl = Linking.createURL('auth-callback');
      const authUrl = `${EMERGENT_AUTH_URL}?redirect=${encodeURIComponent(redirectUrl)}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

      if (result.type === 'success' && result.url) {
        // Extract session_id from URL fragment
        const url = result.url;
        const hashPart = url.split('#')[1] || '';
        const params = new URLSearchParams(hashPart);
        const sessionId = params.get('session_id');

        if (sessionId) {
          const authResult = await googleAuth(sessionId);
          if (!authResult.success) {
            Alert.alert(t('Fehler', 'Errore'), authResult.error || 'Google Login fehlgeschlagen');
          }
        } else {
          Alert.alert(t('Fehler', 'Errore'), t('Keine Session-ID erhalten', 'Nessun ID sessione ricevuto'));
        }
      }
    } catch (e) {
      Alert.alert(t('Fehler', 'Errore'), t('Google-Login fehlgeschlagen', 'Login Google fallito'));
    } finally {
      setGoogleLoading(false);
    }
  }, [googleAuth, t]);

  const handleSkip = useCallback(() => {
    router.replace('/(tabs)');
  }, [router]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1B5E3B', '#2E7D52', '#3D9966']} style={styles.gradient}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo / Header */}
            <View style={styles.header} testID="login-header">
              <View style={styles.logoCircle}>
                <MaterialCommunityIcons name="leaf" size={40} color="#2E7D52" />
              </View>
              <Text style={styles.appName}>VitaGuide</Text>
              <Text style={styles.subtitle}>
                {t('Dein persoenlicher Gesundheitscoach', 'Il tuo coach di salute personale')}
              </Text>
            </View>

            {/* Form Card */}
            <View style={styles.card} testID="login-form-card">
              <Text style={styles.cardTitle}>
                {mode === 'login'
                  ? t('Anmelden', 'Accedi')
                  : t('Konto erstellen', 'Crea account')}
              </Text>

              {mode === 'register' && (
                <View style={styles.inputGroup}>
                  <MaterialCommunityIcons name="account-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('Vorname', 'Nome')}
                    placeholderTextColor="#9CA3AF"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    testID="register-firstname-input"
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <MaterialCommunityIcons name="email-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('E-Mail', 'Email')}
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="login-email-input"
                />
              </View>

              <View style={styles.inputGroup}>
                <MaterialCommunityIcons name="lock-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder={t('Passwort', 'Password')}
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  testID="login-password-input"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <MaterialCommunityIcons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={loading}
                testID="login-submit-button"
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitText}>
                    {mode === 'login'
                      ? t('Anmelden', 'Accedi')
                      : t('Registrieren', 'Registrati')}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('oder', 'oppure')}</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Login */}
              <TouchableOpacity
                style={styles.googleBtn}
                onPress={handleGoogleLogin}
                disabled={googleLoading}
                testID="google-login-button"
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color="#374151" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="google" size={20} color="#EA4335" />
                    <Text style={styles.googleText}>
                      {t('Mit Google anmelden', 'Accedi con Google')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Switch Mode */}
              <TouchableOpacity
                style={styles.switchBtn}
                onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
                testID="login-switch-mode"
              >
                <Text style={styles.switchText}>
                  {mode === 'login'
                    ? t('Noch kein Konto? Jetzt registrieren', 'Non hai un account? Registrati')
                    : t('Bereits ein Konto? Anmelden', 'Hai gia un account? Accedi')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Skip Button */}
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleSkip}
              testID="login-skip-button"
            >
              <Text style={styles.skipText}>
                {t('Ohne Anmeldung fortfahren', 'Continua senza accesso')}
              </Text>
              <MaterialCommunityIcons name="arrow-right" size={16} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  appName: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 4, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#1F2937', marginBottom: 20, textAlign: 'center' },
  inputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 14, marginBottom: 12, height: 50 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#1F2937', height: 50 },
  eyeBtn: { padding: 4 },
  submitBtn: { backgroundColor: '#2E7D52', borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  submitText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: 13, color: '#9CA3AF', paddingHorizontal: 12 },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, height: 50, borderWidth: 1, borderColor: '#E5E7EB', gap: 10 },
  googleText: { fontSize: 15, fontWeight: '500', color: '#374151' },
  switchBtn: { marginTop: 16, alignItems: 'center' },
  switchText: { fontSize: 13, color: '#2E7D52', fontWeight: '500' },
  skipBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 6 },
  skipText: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
});
