import React, { useState, useRef, useEffect } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, Alert, Platform, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createAudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface TTSButtonProps {
  text: string;
  lang: string;
  testID?: string;
}

export function TTSButton({ text, lang, testID = 'tts-btn' }: TTSButtonProps) {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const webAudioRef = useRef<any>(null);
  const playerRef = useRef<any>(null);

  const stopAudio = () => {
    if (Platform.OS === 'web') {
      if (webAudioRef.current) {
        webAudioRef.current.pause();
        webAudioRef.current.currentTime = 0;
        webAudioRef.current = null;
      }
    } else {
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current = null;
      }
    }
    setPlaying(false);
  };

  const playTTS = async () => {
    if (playing) { stopAudio(); return; }
    if (!text?.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/tts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), lang }),
      });
      if (!res.ok) throw new Error('TTS failed');
      const data = await res.json();

      if (Platform.OS === 'web') {
        const audio = new window.Audio(`data:audio/mp3;base64,${data.audio_base64}`);
        audio.onended = () => setPlaying(false);
        audio.play();
        webAudioRef.current = audio;
        setPlaying(true);
      } else {
        // Write base64 to temp file, then play with expo-audio
        const fileUri = `${FileSystem.cacheDirectory}tts_${Date.now()}.mp3`;
        await FileSystem.writeAsStringAsync(fileUri, data.audio_base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const player = createAudioPlayer(fileUri);
        player.addListener('playbackStatusUpdate', (status: any) => {
          if (status.playing === false && status.currentTime > 0) {
            setPlaying(false);
            playerRef.current = null;
          }
        });
        playerRef.current = player;
        player.play();
        setPlaying(true);
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
        <ActivityIndicator size="small" color="#D14953" />
      ) : (
        <MaterialCommunityIcons
          name={playing ? 'stop-circle' : 'play-circle'}
          size={28}
          color="#D14953"
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
