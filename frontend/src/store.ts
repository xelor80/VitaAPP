// Simple in-memory store for sharing analysis data between screens
type AnalysisData = any;

let _currentAnalysis: AnalysisData | null = null;

export function setCurrentAnalysis(data: AnalysisData): void {
  _currentAnalysis = data;
}

export function getCurrentAnalysis(): AnalysisData | null {
  return _currentAnalysis;
}
