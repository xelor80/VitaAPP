import { StyleSheet, Dimensions } from 'react-native';
const W = Dimensions.get('window').width;

export const trackingStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF9' },
  content: { padding: 20, paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '700', color: '#1A2D26' },

  // Progress Ring
  progressCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16, alignItems: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: '100%' },
  progressCenter: { alignItems: 'center' },
  progressPct: { fontSize: 36, fontWeight: '800', color: '#4A8B71' },
  progressLabel: { fontSize: 13, color: '#5C7A6F', marginTop: 2 },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#1A2D26' },
  statLabel: { fontSize: 11, color: '#8FA39B', marginTop: 2, textAlign: 'center' },
  streakIcon: { marginBottom: 4 },

  // Coach message
  coachCard: { backgroundColor: '#E8F5E9', borderRadius: 16, padding: 14, marginBottom: 16, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  coachText: { flex: 1, fontSize: 14, color: '#2D5A3F', lineHeight: 22 },

  // Section
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A2D26', marginBottom: 10, marginTop: 8 },

  // Tabs
  tabs: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 4, marginBottom: 16 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12 },
  tabActive: { backgroundColor: '#4A8B71' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#5C7A6F' },
  tabTextActive: { color: '#FFFFFF' },

  // Chart wrapper
  chartCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 16, overflow: 'hidden' },
  chartTitle: { fontSize: 15, fontWeight: '600', color: '#1A2D26', marginBottom: 10 },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 8 },
  trendBadgeText: { fontSize: 12, fontWeight: '600' },

  // Compliance
  complianceCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 12 },
  complianceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  complianceRate: { fontSize: 20, fontWeight: '700' },
  complianceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F4F2' },
  complianceName: { flex: 1, fontSize: 14, color: '#1A2D26' },
  checkBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },

  // Milestones
  milestonesCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 16 },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  milestoneBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  milestoneName: { fontSize: 14, fontWeight: '600', color: '#1A2D26' },

  // Insights
  insightCard: { borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  insightTitle: { fontSize: 14, fontWeight: '700' },
  insightText: { fontSize: 13, lineHeight: 20, marginTop: 2 },

  // Rating input
  ratingCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16 },
  ratingTitle: { fontSize: 15, fontWeight: '600', color: '#1A2D26', marginBottom: 10 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  ratingLabel: { fontSize: 13, color: '#5C7A6F', width: 100 },
  ratingDots: { flexDirection: 'row', flex: 1, gap: 3 },
  ratingDot: { flex: 1, height: 32, borderRadius: 8, backgroundColor: '#F0F4F2', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E0E6E2' },
  ratingDotActive: { backgroundColor: '#4A8B71', borderColor: '#4A8B71' },
  ratingDotText: { fontSize: 11, fontWeight: '600', color: '#5C7A6F' },
  ratingDotTextActive: { color: '#FFFFFF' },
  saveBtn: { backgroundColor: '#4A8B71', borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },

  // Empty
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 30, alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A2D26', marginTop: 12 },
  emptyText: { fontSize: 13, color: '#5C7A6F', textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
