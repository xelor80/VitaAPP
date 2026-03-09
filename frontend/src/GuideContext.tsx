import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface GuideState {
  onboardingComplete: boolean;
  seenTips: string[];
  guideVisible: boolean;
  guideDismissedUntil: string | null;
  currentStep: number;
}

interface GuideContextType extends GuideState {
  disclaimerAccepted: boolean;
  setDisclaimerAccepted: (val: boolean) => void;
  completeOnboarding: () => void;
  markTipSeen: (tipId: string) => void;
  showGuide: () => void;
  hideGuide: () => void;
  dismissTemporarily: () => void;
  setStep: (step: number) => void;
  resetGuide: () => void;
}

const STORAGE_KEY = 'vitaguide_guide_state';

const defaultState: GuideState = {
  onboardingComplete: false,
  seenTips: [],
  guideVisible: true,
  guideDismissedUntil: null,
  currentStep: 0,
};

const GuideContext = createContext<GuideContextType>({
  ...defaultState,
  disclaimerAccepted: false,
  setDisclaimerAccepted: () => {},
  completeOnboarding: () => {},
  markTipSeen: () => {},
  showGuide: () => {},
  hideGuide: () => {},
  dismissTemporarily: () => {},
  setStep: () => {},
  resetGuide: () => {},
});

export function GuideProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GuideState>(defaultState);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          setState(prev => ({ ...prev, ...saved, guideVisible: true }));
        } catch {}
      }
    }).catch(() => {});
    // Also check disclaimer on mount
    AsyncStorage.getItem('disclaimer_accepted').then(val => {
      if (val === 'true') setDisclaimerAccepted(true);
    }).catch(() => {});
  }, []);

  const persist = useCallback((newState: GuideState) => {
    const { guideVisible, ...toSave } = newState;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave)).catch(() => {});
  }, []);

  const completeOnboarding = useCallback(() => {
    setState(prev => {
      const next = { ...prev, onboardingComplete: true, currentStep: 0 };
      persist(next);
      return next;
    });
  }, [persist]);

  const markTipSeen = useCallback((tipId: string) => {
    setState(prev => {
      if (prev.seenTips.includes(tipId)) return prev;
      const next = { ...prev, seenTips: [...prev.seenTips, tipId] };
      persist(next);
      return next;
    });
  }, [persist]);

  const showGuide = useCallback(() => {
    setState(prev => ({ ...prev, guideVisible: true }));
  }, []);

  const hideGuide = useCallback(() => {
    setState(prev => ({ ...prev, guideVisible: false }));
  }, []);

  const dismissTemporarily = useCallback(() => {
    const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    setState(prev => {
      const next = { ...prev, guideVisible: false, guideDismissedUntil: until };
      persist(next);
      return next;
    });
  }, [persist]);

  const setStep = useCallback((step: number) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const resetGuide = useCallback(() => {
    const next = { ...defaultState };
    setState(next);
    persist(next);
  }, [persist]);

  return (
    <GuideContext.Provider value={{
      ...state,
      disclaimerAccepted,
      setDisclaimerAccepted,
      completeOnboarding,
      markTipSeen,
      showGuide,
      hideGuide,
      dismissTemporarily,
      setStep,
      resetGuide,
    }}>
      {children}
    </GuideContext.Provider>
  );
}

export function useGuide() {
  return useContext(GuideContext);
}
