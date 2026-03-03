import { StyleSheet } from 'react-native';

export const planStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF9' },
  content: { padding: 20, paddingBottom: 100 },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#1A2D26' },
  subtitle: { fontSize: 14, color: '#5C7A6F', marginTop: 2 },
  reminderBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },

  // Summary Card
  summaryCard: { backgroundColor: '#E8F5E9', borderRadius: 16, padding: 16, marginBottom: 16, flexDirection: 'column', gap: 10 },
  summaryText: { fontSize: 14, color: '#2D5A3F', lineHeight: 22 },

  // Warnings
  warningsCard: { backgroundColor: '#FEF2F2', borderRadius: 16, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#DC2626' },
  warningsTitle: { fontSize: 16, fontWeight: '700', color: '#DC2626', marginBottom: 8 },
  warningText: { fontSize: 13, color: '#991B1B', lineHeight: 20, marginBottom: 4 },

  // Reminders
  reminderCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E0E6E2' },
  reminderTitle: { fontSize: 16, fontWeight: '700', color: '#1A2D26', marginBottom: 12 },
  reminderToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  reminderToggleText: { fontSize: 14, color: '#5C7A6F' },
  reminderTimes: { gap: 10 },
  reminderTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reminderTimeLabel: { fontSize: 14, color: '#5C7A6F', width: 70 },
  reminderTimeInput: { flex: 1, height: 40, backgroundColor: '#F0F4F2', borderRadius: 10, paddingHorizontal: 12, fontSize: 14, color: '#1A2D26', borderWidth: 1, borderColor: '#E0E6E2' },
  reminderSaveBtn: { backgroundColor: '#4A8B71', borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 12 },
  reminderSaveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  // Tabs
  tabs: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 4, marginBottom: 16 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, gap: 6 },
  tabActive: { backgroundColor: '#4A8B71' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#5C7A6F' },
  tabTextActive: { color: '#FFFFFF' },

  // Supplement Card
  supplementCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E0E6E2' },
  supplementHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  riskDot: { width: 12, height: 12, borderRadius: 6 },
  supplementName: { fontSize: 16, fontWeight: '700', color: '#1A2D26' },
  supplementDosage: { fontSize: 13, color: '#5C7A6F', marginTop: 2 },

  supplementDetails: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F4F2' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 4 },
  detailLabel: { fontSize: 14, fontWeight: '600', color: '#1A2D26' },
  detailText: { fontSize: 13, color: '#5C7A6F', lineHeight: 20, marginLeft: 24 },
  sideEffectText: { fontSize: 13, color: '#92400E', lineHeight: 20, marginLeft: 24 },
  medWarningText: { fontSize: 13, color: '#DC2626', lineHeight: 20, marginLeft: 24, fontWeight: '600' },

  // Schedule
  scheduleSection: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12 },
  scheduleHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  scheduleTitle: { fontSize: 18, fontWeight: '700', color: '#1A2D26', flex: 1 },
  scheduleCount: { fontSize: 14, fontWeight: '600', color: '#4A8B71', backgroundColor: '#E8F5E9', width: 28, height: 28, borderRadius: 14, textAlign: 'center', lineHeight: 28 },
  scheduleItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F4F2' },
  scheduleItemName: { flex: 1, fontSize: 14, color: '#1A2D26' },
  scheduleItemDose: { fontSize: 14, fontWeight: '600', color: '#4A8B71' },
  scheduleNote: { fontSize: 12, color: '#8FA39B', marginTop: 8, fontStyle: 'italic' },

  // Phases
  phaseCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#4A8B71' },
  phaseHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  phaseBadge: { backgroundColor: '#4A8B71', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  phaseBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  phaseTitle: { fontSize: 16, fontWeight: '700', color: '#1A2D26' },
  phaseDescription: { fontSize: 14, color: '#5C7A6F', lineHeight: 20, marginBottom: 8 },
  phaseNote: { fontSize: 13, color: '#4A8B71', lineHeight: 20, fontStyle: 'italic' },

  // Empty state
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#1A2D26', marginTop: 16, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#5C7A6F', marginTop: 8, textAlign: 'center', lineHeight: 22 },
  generateButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#4A8B71', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14, marginTop: 24 },
  generateButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  backLink: { marginTop: 16 },
  backLinkText: { fontSize: 14, color: '#4A8B71', textDecorationLine: 'underline' },

  // Disclaimer
  disclaimerText: { fontSize: 11, color: '#8FA39B', textAlign: 'center', marginTop: 20, lineHeight: 18, paddingHorizontal: 20 },

  // Product Recommendations
  productCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12, marginTop: 8, marginLeft: 24, borderWidth: 1, borderColor: '#BFDBFE' },
  productImageWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center' },
  productName: { fontSize: 14, fontWeight: '600', color: '#1E40AF' },
  productDesc: { fontSize: 12, color: '#6B7280', marginTop: 2, lineHeight: 16 },

  // Evidence Badges
  evidenceBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, marginRight: 6 },
  evidenceBadgeText: { fontSize: 10, fontWeight: '700' },
  evidenceCard: { borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1 },
  evidenceCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  evidenceCardTitle: { fontSize: 14, fontWeight: '700' },
  evidenceCardDesc: { fontSize: 13, color: '#374151', lineHeight: 20 },

  // Recommendation Reasons
  reasonsCard: { backgroundColor: '#F8FAF9', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E0E6E2' },
  reasonsTitle: { fontSize: 13, fontWeight: '700', color: '#1A2D26', marginBottom: 8 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  reasonDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4A8B71' },
  reasonText: { fontSize: 13, color: '#374151', lineHeight: 18 },
});
