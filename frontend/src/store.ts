// Store for sharing analysis data between screens, with AsyncStorage persistence
import AsyncStorage from '@react-native-async-storage/async-storage';

type AnalysisData = any;

let _currentAnalysis: AnalysisData | null = null;

const STORAGE_KEY = 'saved_analysis';

export function setCurrentAnalysis(data: AnalysisData): void {
  _currentAnalysis = data;
  // Persist to AsyncStorage
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
}

export function getCurrentAnalysis(): AnalysisData | null {
  return _currentAnalysis;
}

export async function loadSavedAnalysis(): Promise<AnalysisData | null> {
  if (_currentAnalysis) return _currentAnalysis;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      _currentAnalysis = JSON.parse(raw);
      return _currentAnalysis;
    }
  } catch {}
  return null;
}

export async function hasSavedAnalysis(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return !!raw;
  } catch {}
  return false;
}
