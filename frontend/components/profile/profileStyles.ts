import { StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 40 - CARD_GAP) / 2;

export const profileStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F6' },
  content: { padding: 20, paddingBottom: 100 },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '700', color: '#1A2D26', textAlign: 'center' },

  // 2x2 Grid
  gridRow: { flexDirection: 'row', gap: CARD_GAP, marginBottom: CARD_GAP },

  // Grid Card Base
  gridCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    minHeight: 220,
    shadowColor: '#1A2D26',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  gridCardTitle: { fontSize: 14, fontWeight: '700', color: '#1A2D26', marginBottom: 12 },

  // Profile Card
  avatarContainer: { alignItems: 'center', marginBottom: 10 },
  avatarCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#4A8B71',
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#4A8B71' },
  profileInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, paddingLeft: 2 },
  profileInfoIcon: { width: 20, alignItems: 'center' },
  profileInfoText: { fontSize: 11, color: '#5C7A6F', fontWeight: '500', flex: 1 },
  nutritionBarWrap: { marginTop: 'auto' as any, paddingTop: 6 },
  nutritionLabel: { fontSize: 10, color: '#8FA39B', marginBottom: 4, fontWeight: '600' },
  nutritionBar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', gap: 2 },
  nutritionSeg: { flex: 1, borderRadius: 3 },

  // BMI Card
  bmiGaugeWrap: { alignItems: 'center', marginTop: 4 },
  bmiValue: { fontSize: 28, fontWeight: '800', color: '#2C5F78', textAlign: 'center', marginTop: -20 },
  bmiCategoryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 4 },
  bmiCatLabel: { fontSize: 9, color: '#8FA39B', fontWeight: '500' },
  bmiCatLabelActive: { fontWeight: '700' },
  bmiBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, marginTop: 'auto' as any, paddingVertical: 6, paddingHorizontal: 10,
    borderRadius: 10, backgroundColor: '#F0FDF4',
  },
  bmiBadgeText: { fontSize: 11, fontWeight: '700', color: '#10B981' },

  // Stress & Sleep Cards
  statusIconWrap: { alignItems: 'center', marginVertical: 8 },
  statusBadge: {
    alignSelf: 'center',
    paddingVertical: 4, paddingHorizontal: 14,
    borderRadius: 12, marginBottom: 12,
  },
  statusBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  sliderWrap: { marginTop: 'auto' as any },
  sliderTrack: { height: 8, borderRadius: 4, position: 'relative' as any },
  sliderHandle: {
    position: 'absolute' as any,
    top: -4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#E0E6E2',
  },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  sliderLabel: { fontSize: 9, color: '#8FA39B', fontWeight: '500' },

  // Warning Card
  warningCard: { backgroundColor: '#FEF2F2', borderRadius: 16, padding: 14, marginBottom: 16, flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderLeftWidth: 4, borderLeftColor: '#DC2626' },
  warningText: { fontSize: 13, color: '#991B1B', lineHeight: 20 },

  // Risk Overview
  riskOverview: { marginBottom: 16, marginTop: 4 },
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
