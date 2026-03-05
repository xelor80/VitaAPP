import React, { useState, useRef, useEffect } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, Alert, Platform, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface TTSButtonProps {
  text: string;
  lang: string;
  testID?: string;
}

export function TTSButton({ text, lang, testID = 'tts-btn' }: TTSButtonProps) {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const stopAudio = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
    setPlaying(false);
  };

  const playTTS = async () => {
    if (playing) { await stopAudio(); return; }
    if (!text?.trim()) return;
    setLoading(true);
    try {
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      }
      const res = await fetch(`${API_URL}/api/tts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), lang }),
      });
      if (!res.ok) throw new Error('TTS failed');
      const data = await res.json();

      if (Platform.OS === 'web') {
        const audioSrc = `data:audio/mp3;base64,${data.audio_base64}`;
        const audio = new window.Audio(audioSrc);
        audio.onended = () => setPlaying(false);
        audio.play();
        setPlaying(true);
        (soundRef as any).current = {
          stopAsync: () => { audio.pause(); audio.currentTime = 0; return Promise.resolve(); },
          unloadAsync: () => Promise.resolve(),
        };
      } else {
        const { sound } = await Audio.Sound.createAsync(
          { uri: `data:audio/mp3;base64,${data.audio_base64}` },
          { shouldPlay: true }
        );
        soundRef.current = sound;
        setPlaying(true);
        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.didJustFinish) {
            setPlaying(false);
            sound.unloadAsync();
            soundRef.current = null;
          }
        });
      }
    } catch {
      Alert.alert(
        lang === 'de' ? 'Fehler' : 'Errore',
        lang === 'de' ? 'Audio konnte nicht generiert werden.' : "Impossibile generare l'audio."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { return () => { stopAudio(); }; }, []);

  return (
    <TouchableOpacity
      testID={testID}
      onPress={playTTS}
      disabled={loading}
      style={s.btn}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#4A8B71" />
      ) : (
        <MaterialCommunityIcons
          name={playing ? 'stop-circle' : 'play-circle'}
          size={28}
          color="#4A8B71"
        />
      )}
      <Text style={s.label}>
        {playing
          ? (lang === 'de' ? 'Stopp' : 'Stop')
          : (lang === 'de' ? 'Vorlesen' : 'Ascolta')}
      </Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D7EDDF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D5A3F',
  },
});
