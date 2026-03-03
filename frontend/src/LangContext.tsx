import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lang } from './i18n';

interface LangContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextType>({ lang: 'de', setLang: () => {} });

function detectDeviceLanguage(): Lang {
  try {
    const raw = Platform.OS === 'web'
      ? (navigator.language || (navigator as any).userLanguage || '')
      : '';
    const code = raw.toLowerCase().split('-')[0];
    if (code === 'it') return 'it';
  } catch {}
  return 'de';
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('de');

  useEffect(() => {
    AsyncStorage.getItem('vitaguide_lang').then(v => {
      if (v === 'it' || v === 'de') {
        setLangState(v);
      } else {
        // No saved preference — auto-detect from device/browser
        const detected = detectDeviceLanguage();
        setLangState(detected);
      }
    });
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem('vitaguide_lang', l);
  };

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
