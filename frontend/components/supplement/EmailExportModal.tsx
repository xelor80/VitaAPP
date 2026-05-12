import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Props {
  visible: boolean;
  onClose: () => void;
  profileId: string;
  lang: string;
}

export function EmailExportModal({ visible, onClose, profileId, lang }: Props) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSend = async () => {
    if (!isValidEmail(email)) return;
    setSending(true);
    setStatus('idle');
    setErrorMsg('');
    try {
      const res = await fetch(`${API_URL}/api/export/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profileId, email, lang }),
      });
      if (res.ok) {
        setStatus('success');
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.detail || (lang === 'de' ? 'Fehler beim Senden' : 'Errore di invio'));
        setStatus('error');
      }
    } catch {
      setErrorMsg(lang === 'de' ? 'Netzwerkfehler' : 'Errore di rete');
      setStatus('error');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setStatus('idle');
    setErrorMsg('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.overlay}
      >
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={handleClose}>
          <TouchableOpacity activeOpacity={1} style={s.card} onPress={() => {}}>
            {/* Header */}
            <View style={s.header}>
              <View style={s.iconCircle}>
                <MaterialCommunityIcons name="email-fast-outline" size={28} color="#1a5632" />
              </View>
              <TouchableOpacity onPress={handleClose} style={s.closeBtn} testID="email-modal-close">
                <MaterialCommunityIcons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={s.title}>
              {lang === 'de' ? 'Bericht per E-Mail senden' : 'Invia rapporto via e-mail'}
            </Text>
            <Text style={s.subtitle}>
              {lang === 'de'
                ? 'Erhalten Sie Ihren Gesundheitsbericht als HTML-Mail mit PDF-Anhang.'
                : 'Ricevi il tuo rapporto sulla salute come e-mail HTML con allegato PDF.'}
            </Text>

            {status === 'success' ? (
              <View style={s.successBox}>
                <MaterialCommunityIcons name="check-circle" size={48} color="#16A34A" />
                <Text style={s.successTitle}>
                  {lang === 'de' ? 'E-Mail gesendet!' : 'E-mail inviata!'}
                </Text>
                <Text style={s.successSubtitle}>
                  {lang === 'de'
                    ? `Ihr Bericht wurde an ${email} gesendet.`
                    : `Il tuo rapporto e stato inviato a ${email}.`}
                </Text>
                <TouchableOpacity style={s.doneBtn} onPress={handleClose} testID="email-done-btn">
                  <Text style={s.doneBtnText}>{lang === 'de' ? 'Fertig' : 'Fatto'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={s.inputWrap}>
                  <MaterialCommunityIcons name="email-outline" size={20} color="#8FA39B" style={s.inputIcon} />
                  <TextInput
                    style={s.input}
                    placeholder={lang === 'de' ? 'E-Mail-Adresse eingeben' : 'Inserisci indirizzo e-mail'}
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!sending}
                    testID="email-input"
                  />
                </View>

                {status === 'error' && (
                  <View style={s.errorBox}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#DC2626" />
                    <Text style={s.errorText}>{errorMsg}</Text>
                  </View>
                )}

                <View style={s.infoRow}>
                  <MaterialCommunityIcons name="file-pdf-box" size={16} color="#4A8B71" />
                  <Text style={s.infoText}>
                    {lang === 'de' ? 'Inkl. PDF-Anhang zum Ausdrucken' : 'Incl. allegato PDF da stampare'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[s.sendBtn, (!isValidEmail(email) || sending) && s.sendBtnDisabled]}
                  onPress={handleSend}
                  disabled={!isValidEmail(email) || sending}
                  testID="email-send-btn"
                >
                  {sending ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="send" size={18} color="#FFF" />
                      <Text style={s.sendBtnText}>
                        {lang === 'de' ? 'Bericht senden' : 'Invia rapporto'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A2D26',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: '#1A2D26',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#5C7A6F',
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1a5632',
    borderRadius: 12,
    paddingVertical: 14,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#16A34A',
    marginTop: 12,
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  doneBtn: {
    backgroundColor: '#1a5632',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 40,
  },
  doneBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
