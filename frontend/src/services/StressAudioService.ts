import { useAudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const STORAGE_KEY = 'vitaguide_audio_settings';

export interface AudioSettings {
  soundEnabled: boolean;
  voiceEnabled: boolean;
  ambientVolume: number;
  voiceVolume: number;
  uiVolume: number;
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
  private audioElement: HTMLAudioElement | null = null;
  private nativePlayer: any = null;
  // Web Audio API ambient
  private audioCtx: AudioContext | null = null;
  private ambientNodes: AudioNode[] = [];
  private ambientGain: GainNode | null = null;
  private ambientRunning = false;

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

  // Play TTS audio for a text via the backend
  async playVoice(text: string, lang: string): Promise<void> {
    if (!this.settings.soundEnabled || !this.settings.voiceEnabled) return;
    try {
      this.stopCurrentAudio();
      const res = await fetch(`${API_URL}/api/voice/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const cacheKey = data.cache_key;
      if (!cacheKey) return;

      // Use streaming URL - works on both native (expo-audio) and web
      const audioUrl = `${API_URL}/api/voice/audio/${cacheKey}`;

      // Try native expo-audio first
      try {
        const { createAudioPlayer, AudioSource } = require('expo-audio');
        if (createAudioPlayer) {
          if (this.nativePlayer) { try { this.nativePlayer.release(); } catch {} }
          this.nativePlayer = createAudioPlayer({ uri: audioUrl });
          this.nativePlayer.volume = this.settings.voiceVolume;
          this.nativePlayer.play();
          return;
        }
      } catch {}

      // Web fallback: HTML5 Audio with streaming URL
      if (typeof window !== 'undefined') {
        this.audioElement = new Audio(audioUrl);
        this.audioElement.volume = this.settings.voiceVolume;
        await this.audioElement.play().catch(() => {});
      }
    } catch {}
  }

  stopCurrentAudio(): void {
    try {
      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.audioElement = null;
      }
      if (this.nativePlayer) {
        try { this.nativePlayer.release(); } catch {}
        this.nativePlayer = null;
      }
    } catch {}
  }

  // ── Web Audio API Ambient Layer ──

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return null;
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    return this.audioCtx;
  }

  async startAmbient(): Promise<void> {
    if (!this.settings.soundEnabled || this.ambientRunning) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') await ctx.resume();

    this.ambientRunning = true;
    const vol = this.settings.ambientVolume;

    // Master gain with fade-in
    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0, ctx.currentTime);
    this.ambientGain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 2);
    this.ambientGain.connect(ctx.destination);

    // Layer 1: Warm filtered noise (ocean-like)
    const bufferSize = ctx.sampleRate * 4;
    const noiseBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = noiseBuffer.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
        b6 = white * 0.115926;
      }
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    const noiseLp = ctx.createBiquadFilter();
    noiseLp.type = 'lowpass';
    noiseLp.frequency.setValueAtTime(400, ctx.currentTime);
    noiseLp.Q.setValueAtTime(0.7, ctx.currentTime);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, ctx.currentTime);
    noiseSource.connect(noiseLp).connect(noiseGain).connect(this.ambientGain!);
    noiseSource.start();
    this.ambientNodes.push(noiseSource);

    // Layer 2: Subtle drone pad (detuned sine waves)
    const droneFreqs = [65, 98, 131]; // C2, G2, C3 — soft harmony
    for (const freq of droneFreqs) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.04, ctx.currentTime);
      osc.connect(oscGain).connect(this.ambientGain!);
      osc.start();
      this.ambientNodes.push(osc);
    }

    // Layer 3: Very slow LFO modulation on noise filter for movement
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.08, ctx.currentTime); // 1 cycle per ~12 seconds
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(150, ctx.currentTime);
    lfo.connect(lfoGain).connect(noiseLp.frequency);
    lfo.start();
    this.ambientNodes.push(lfo);
  }

  async stopAmbient(): Promise<void> {
    if (!this.ambientRunning) return;
    const ctx = this.audioCtx;
    if (ctx && this.ambientGain) {
      // Fade out over 2 seconds
      this.ambientGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
      await new Promise(r => setTimeout(r, 2100));
    }
    for (const node of this.ambientNodes) {
      try { (node as any).stop?.(); (node as any).disconnect?.(); } catch {}
    }
    this.ambientNodes = [];
    this.ambientGain = null;
    this.ambientRunning = false;
  }

  // ── Completion Chime ──

  async playCompletionChime(): Promise<void> {
    if (!this.settings.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') await ctx.resume();

    const vol = this.settings.uiVolume;
    const now = ctx.currentTime;

    // Gentle bell-like chime: two harmonics with quick attack and slow decay
    const frequencies = [523, 659, 784]; // C5, E5, G5 — major chord
    for (let i = 0; i < frequencies.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequencies[i], now);
      const gain = ctx.createGain();
      const start = now + i * 0.15;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(vol * 0.4, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 3.5);
    }
  }

  // ── UI Start Sound ──

  async playStartSound(): Promise<void> {
    if (!this.settings.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') await ctx.resume();

    const vol = this.settings.uiVolume;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(523, now + 0.3);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol * 0.3, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.2);
  }

  async cleanup(): Promise<void> {
    this.stopCurrentAudio();
    await this.stopAmbient();
    if (this.audioCtx) {
      try { await this.audioCtx.close(); } catch {}
      this.audioCtx = null;
    }
  }
}

export const stressAudio = new StressAudioService();
