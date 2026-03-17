import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lang } from './i18n';

interface LangContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextType>({ lang: 'de', setLang: () => {} });

const SUPPORTED_LANGS: Lang[] = ['de', 'it', 'en'];

function detectDeviceLanguage(): Lang {
  try {
    const raw = Platform.OS === 'web'
      ? (navigator.language || (navigator as any).userLanguage || '')
      : '';
    const code = raw.toLowerCase().split('-')[0] as Lang;
    if (SUPPORTED_LANGS.includes(code)) return code;
  } catch {}
  return 'de';
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('de');

  useEffect(() => {
    AsyncStorage.getItem('vitaguide_lang').then(v => {
      if (v && SUPPORTED_LANGS.includes(v as Lang)) {
        setLangState(v as Lang);
      } else {
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
