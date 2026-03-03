import { StyleSheet } from 'react-native';

export const profileStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF9' },
  content: { padding: 20, paddingBottom: 100 },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '700', color: '#1A2D26', textAlign: 'center' },

  // Bio Card
  bioCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16 },
  bioRow: { flexDirection: 'row', justifyContent: 'space-around' },
  bioItem: { alignItems: 'center', flex: 1 },
  bioValue: { fontSize: 18, fontWeight: '700', color: '#1A2D26', marginTop: 4 },
  bioLabel: { fontSize: 11, color: '#8FA39B', marginTop: 2 },

  // Warning Card
  warningCard: { backgroundColor: '#FEF2F2', borderRadius: 16, padding: 14, marginBottom: 16, flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderLeftWidth: 4, borderLeftColor: '#DC2626' },
  warningText: { fontSize: 13, color: '#991B1B', lineHeight: 20 },

  // Risk Overview
  riskOverview: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A2D26', marginBottom: 12 },
  riskSummary: { flexDirection: 'row', gap: 10 },
  riskBadge: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  riskBadgeNum: { fontSize: 28, fontWeight: '800' },
  riskBadgeLabel: { fontSize: 12, color: '#5C7A6F', marginTop: 2 },

  // Deficiency Cards
  defCard: { borderRadius: 14, padding: 14, marginBottom: 10, borderLeftWidth: 4 },
  defHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  defName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1A2D26' },
  defRiskTag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  defRiskText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  defReason: { fontSize: 12, color: '#5C7A6F', marginTop: 6, marginLeft: 32 },

  // Priority Section
  prioritySection: { marginTop: 8, marginBottom: 16 },
  priorityCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 8 },
  priorityTitle: { fontSize: 15, fontWeight: '600', color: '#1A2D26' },
  priorityDesc: { fontSize: 13, color: '#5C7A6F', marginTop: 4, lineHeight: 20 },

  // Action Buttons
  actionSection: { marginTop: 8, gap: 10 },
  ctaBtn: { backgroundColor: '#4A8B71', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  ctaBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#4A8B71' },
  secondaryBtnText: { color: '#4A8B71', fontSize: 15, fontWeight: '600' },

  // Empty State
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1A2D26', marginTop: 16, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#5C7A6F', marginTop: 8, textAlign: 'center', lineHeight: 22 },

  // Disclaimer
  disclaimerText: { fontSize: 11, color: '#8FA39B', textAlign: 'center', marginTop: 20, lineHeight: 18, paddingHorizontal: 20 },
});
