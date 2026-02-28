import { StyleSheet } from 'react-native';

export const onboardingStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F6' },
  content: { flex: 1, padding: 20 },
  
  // Progress
  progressContainer: { paddingHorizontal: 20, paddingTop: 20 },
  progressBar: { height: 4, backgroundColor: '#E0E6E2', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#4A8B71', borderRadius: 2 },
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', marginTop: 12, gap: 8 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0E6E2' },
  stepDotActive: { backgroundColor: '#4A8B71' },
  stepDotCompleted: { backgroundColor: '#2C5F78' },
  
  // Header
  header: { alignItems: 'center', marginBottom: 24 },
  stepTitle: { fontSize: 24, fontWeight: '700', color: '#1A2D26', marginBottom: 8 },
  stepSubtitle: { fontSize: 15, color: '#5C7A6F', textAlign: 'center' },
  
  // Card
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1A2D26', marginBottom: 12 },
  
  // Form Elements
  label: { fontSize: 14, fontWeight: '500', color: '#5C7A6F', marginBottom: 8 },
  input: {
    backgroundColor: '#F7F9F6', borderRadius: 12, padding: 14, fontSize: 16,
    color: '#1A2D26', borderWidth: 1, borderColor: '#E0E6E2',
  },
  inputRow: { flexDirection: 'row', gap: 12 },
  inputHalf: { flex: 1 },
  
  // Select Options
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionButton: {
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12,
    backgroundColor: '#F7F9F6', borderWidth: 1, borderColor: '#E0E6E2',
  },
  optionButtonSelected: { backgroundColor: '#4A8B71', borderColor: '#4A8B71' },
  optionText: { fontSize: 14, fontWeight: '500', color: '#5C7A6F' },
  optionTextSelected: { color: '#FFFFFF' },
  
  // Multi-Select Chips
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 20, backgroundColor: '#F7F9F6', borderWidth: 1, borderColor: '#E0E6E2', gap: 6,
  },
  chipSelected: { backgroundColor: '#2C5F78', borderColor: '#2C5F78' },
  chipText: { fontSize: 14, fontWeight: '500', color: '#5C7A6F' },
  chipTextSelected: { color: '#FFFFFF' },
  
  // Slider
  sliderContainer: { marginBottom: 16 },
  sliderLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sliderValue: { fontSize: 24, fontWeight: '700', color: '#4A8B71' },
  sliderTrack: { height: 8, backgroundColor: '#E0E6E2', borderRadius: 4 },
  sliderFill: { height: '100%', backgroundColor: '#4A8B71', borderRadius: 4 },
  sliderDots: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  sliderDot: { fontSize: 12, color: '#8FA39B' },
  
  // Complaint Item
  complaintItem: {
    flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12,
    backgroundColor: '#F7F9F6', marginBottom: 8, gap: 12,
  },
  complaintItemSelected: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#4A8B71' },
  complaintName: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1A2D26' },
  intensityBadge: {
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#4A8B71',
  },
  intensityText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  
  // Navigation
  navContainer: {
    flexDirection: 'row', padding: 20, gap: 12, backgroundColor: '#F7F9F6',
    borderTopWidth: 1, borderTopColor: '#E0E6E2',
  },
  backButton: {
    flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: '#E8F5E9',
    alignItems: 'center',
  },
  backButtonText: { fontSize: 16, fontWeight: '600', color: '#4A8B71' },
  nextButton: {
    flex: 2, paddingVertical: 16, borderRadius: 12, backgroundColor: '#4A8B71',
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  nextButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  skipButton: {
    paddingVertical: 12, alignItems: 'center',
  },
  skipButtonText: { fontSize: 14, color: '#8FA39B' },
  
  // Assessment Results
  assessmentContainer: { padding: 20 },
  assessmentHeader: { alignItems: 'center', marginBottom: 24 },
  assessmentTitle: { fontSize: 28, fontWeight: '700', color: '#1A2D26', marginBottom: 8 },
  assessmentSubtitle: { fontSize: 15, color: '#5C7A6F', textAlign: 'center' },
  
  bmiCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16,
    alignItems: 'center',
  },
  bmiValue: { fontSize: 48, fontWeight: '700', color: '#4A8B71' },
  bmiLabel: { fontSize: 14, color: '#5C7A6F', marginTop: 4 },
  bmiCategory: { fontSize: 16, fontWeight: '600', color: '#1A2D26', marginTop: 8 },
  
  deficiencyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    borderLeftWidth: 4,
  },
  deficiencyHigh: { borderLeftColor: '#EF4444' },
  deficiencyMedium: { borderLeftColor: '#F59E0B' },
  deficiencyLow: { borderLeftColor: '#10B981' },
  deficiencyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  deficiencyName: { fontSize: 16, fontWeight: '700', color: '#1A2D26' },
  deficiencyRisk: { fontSize: 12, fontWeight: '700', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  deficiencyRiskHigh: { backgroundColor: '#FEE2E2', color: '#DC2626' },
  deficiencyRiskMedium: { backgroundColor: '#FEF3C7', color: '#D97706' },
  deficiencyRiskLow: { backgroundColor: '#D1FAE5', color: '#059669' },
  deficiencyWhy: { fontSize: 14, color: '#5C7A6F', marginBottom: 8 },
  deficiencyFoods: { fontSize: 13, color: '#8FA39B' },
  
  warningCard: {
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, marginBottom: 12,
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  warningText: { flex: 1, fontSize: 14, color: '#991B1B' },
  
  priorityCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  priorityIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center',
  },
  priorityTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1A2D26' },
  priorityBadge: { fontSize: 11, fontWeight: '700', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  priorityBadgeHigh: { backgroundColor: '#FEE2E2', color: '#DC2626' },
  priorityBadgeMedium: { backgroundColor: '#FEF3C7', color: '#D97706' },
  
  completeButton: {
    backgroundColor: '#4A8B71', borderRadius: 16, paddingVertical: 18, alignItems: 'center',
    marginTop: 16,
  },
  completeButtonText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  
  // Disclaimer
  disclaimerText: {
    fontSize: 12, color: '#8FA39B', textAlign: 'center', marginTop: 16, paddingHorizontal: 20,
  },
});
