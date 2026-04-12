import { Audio } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'vitaguide_audio_settings';

export interface AudioSettings {
  soundEnabled: boolean;
  voiceEnabled: boolean;
  ambientVolume: number;   // 0-1
  voiceVolume: number;     // 0-1 (for future TTS)
  uiVolume: number;        // 0-1
}

const DEFAULT_SETTINGS: AudioSettings = {
  soundEnabled: true,
  voiceEnabled: true,
  ambientVolume: 0.25,
  voiceVolume: 0.65,
  uiVolume: 0.20,
};

// Voice guidance texts for breathing exercises
export const VOICE_TEXTS: Record<string, Record<string, { text: string; duration: number }[]>> = {
  de: {
    intro: [
      { text: 'Finde eine bequeme Position.', duration: 3000 },
      { text: 'Schliesse die Augen, wenn du moechtest.', duration: 3000 },
      { text: 'Wir beginnen gleich.', duration: 2000 },
    ],
    inhale: [
      { text: 'Atme langsam ein...', duration: 0 },
      { text: 'Einatmen...', duration: 0 },
      { text: 'Tief einatmen...', duration: 0 },
    ],
    hold: [
      { text: 'Halte...', duration: 0 },
      { text: 'Halten...', duration: 0 },
      { text: 'Sanft halten...', duration: 0 },
    ],
    exhale: [
      { text: 'Langsam ausatmen...', duration: 0 },
      { text: 'Ausatmen...', duration: 0 },
      { text: 'Loslassen...', duration: 0 },
    ],
    midpoint: [
      { text: 'Du machst das gut.', duration: 3000 },
      { text: 'Spuere die Ruhe.', duration: 3000 },
    ],
    outro: [
      { text: 'Gut gemacht.', duration: 3000 },
      { text: 'Komm langsam zurueck.', duration: 3000 },
      { text: 'Oeffne die Augen, wenn du bereit bist.', duration: 3000 },
    ],
  },
  it: {
    intro: [
      { text: 'Trova una posizione comoda.', duration: 3000 },
      { text: 'Chiudi gli occhi, se vuoi.', duration: 3000 },
      { text: 'Cominciamo.', duration: 2000 },
    ],
    inhale: [
      { text: 'Inspira lentamente...', duration: 0 },
      { text: 'Inspira...', duration: 0 },
      { text: 'Inspira profondamente...', duration: 0 },
    ],
    hold: [
      { text: 'Trattieni...', duration: 0 },
      { text: 'Mantieni...', duration: 0 },
      { text: 'Dolcemente trattieni...', duration: 0 },
    ],
    exhale: [
      { text: 'Espira lentamente...', duration: 0 },
      { text: 'Espira...', duration: 0 },
      { text: 'Lascia andare...', duration: 0 },
    ],
    midpoint: [
      { text: 'Stai andando bene.', duration: 3000 },
      { text: 'Senti la calma.', duration: 3000 },
    ],
    outro: [
      { text: 'Ben fatto.', duration: 3000 },
      { text: 'Torna lentamente.', duration: 3000 },
      { text: 'Apri gli occhi quando sei pronto.', duration: 3000 },
    ],
  },
};

// Guided step voice texts
export const GUIDED_VOICE: Record<string, Record<string, string>> = {
  de: {
    begin: 'Lass uns beginnen.',
    focus: 'Konzentriere dich auf deinen Koerper.',
    breathe: 'Atme ruhig weiter.',
    relax: 'Lass alle Anspannung los.',
    almost: 'Gleich geschafft.',
    done: 'Wunderbar. Du hast es geschafft.',
  },
  it: {
    begin: 'Cominciamo.',
    focus: 'Concentrati sul tuo corpo.',
    breathe: 'Continua a respirare con calma.',
    relax: 'Lascia andare ogni tensione.',
    almost: 'Quasi finito.',
    done: 'Meraviglioso. Ce l\'hai fatta.',
  },
};

class StressAudioService {
  private settings: AudioSettings = DEFAULT_SETTINGS;
  private ambientSound: any = null;
  private loaded = false;

  async loadSettings(): Promise<AudioSettings> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {}
    return this.settings;
  }

  async saveSettings(settings: Partial<AudioSettings>): Promise<AudioSettings> {
    this.settings = { ...this.settings, ...settings };
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {}
    return this.settings;
  }

  getSettings(): AudioSettings {
    return this.settings;
  }

  // Get a random voice text for a phase
  getVoiceText(lang: string, phase: string, index?: number): string {
    const l = lang === 'it' ? 'it' : 'de';
    const texts = VOICE_TEXTS[l]?.[phase];
    if (!texts || texts.length === 0) return '';
    const i = index !== undefined ? index % texts.length : Math.floor(Math.random() * texts.length);
    return texts[i].text;
  }

  getIntroTexts(lang: string): { text: string; duration: number }[] {
    const l = lang === 'it' ? 'it' : 'de';
    return VOICE_TEXTS[l]?.intro || [];
  }

  getOutroTexts(lang: string): { text: string; duration: number }[] {
    const l = lang === 'it' ? 'it' : 'de';
    return VOICE_TEXTS[l]?.outro || [];
  }

  getGuidedVoice(lang: string, key: string): string {
    const l = lang === 'it' ? 'it' : 'de';
    return GUIDED_VOICE[l]?.[key] || '';
  }

  async cleanup() {
    try {
      if (this.ambientSound) {
        await this.ambientSound.unloadAsync?.();
        this.ambientSound = null;
      }
    } catch {}
  }
}

export const stressAudio = new StressAudioService();
