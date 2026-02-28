import React, { createContext, useContext, useEffect, useState } from 'react';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface SymptomChip {
  id: string;
  de: string;
  it: string;
  icon: string;
  order: number;
}

interface DisclaimerItem {
  title: string;
  text: string;
  icon: string;
}

interface DisclaimerData {
  title: string;
  items: DisclaimerItem[];
  accept_button: string;
}

interface SettingsContextType {
  translations: Record<string, { de: string; it: string }>;
  chips: SymptomChip[];
  disclaimer: { de: DisclaimerData | null; it: DisclaimerData | null };
  loaded: boolean;
}

const SettingsContext = createContext<SettingsContextType>({
  translations: {},
  chips: [],
  disclaimer: { de: null, it: null },
  loaded: false,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsContextType>({
    translations: {},
    chips: [],
    disclaimer: { de: null, it: null },
    loaded: false,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [transRes, chipsRes, disclaimerRes] = await Promise.all([
          fetch(`${API_URL}/api/settings/translations`).then(r => r.json()).catch(() => ({ translations: [] })),
          fetch(`${API_URL}/api/settings/symptom-chips`).then(r => r.json()).catch(() => ({ chips: [] })),
          fetch(`${API_URL}/api/settings/disclaimer`).then(r => r.json()).catch(() => ({ de: null, it: null })),
        ]);

        const transMap: Record<string, { de: string; it: string }> = {};
        for (const t of transRes.translations || []) {
          transMap[t.key] = { de: t.de, it: t.it };
        }

        setSettings({
          translations: transMap,
          chips: chipsRes.chips || [],
          disclaimer: { de: disclaimerRes.de || null, it: disclaimerRes.it || null },
          loaded: true,
        });
      } catch {
        setSettings(prev => ({ ...prev, loaded: true }));
      }
    };
    load();
  }, []);

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}
