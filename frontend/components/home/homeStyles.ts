import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F9F6' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 14, paddingBottom: 100 },

  // Header
  header: { alignItems: 'center', marginTop: 6, marginBottom: 8 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 28, fontWeight: '700', color: '#1A2D26' },
  greetingText: { fontSize: 18, fontWeight: '700', color: '#1A2D26', marginTop: 6 },
  headerSubtitle: { fontSize: 15, color: '#5C7A6F', marginTop: 4 },
  langSwitcherSmall: { flexDirection: 'row', gap: 4, width: 80, justifyContent: 'flex-end' },
  langBtnSm: {
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12,
    backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#D4E7DC',
  },
  langBtnSmActive: { backgroundColor: '#2C5F78', borderColor: '#2C5F78' },
  langBtnSmText: { fontSize: 13, fontWeight: '700', color: '#2C5F78' },
  langBtnSmTextActive: { color: '#FFFFFF' },

  // Card
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05,
    shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A2D26', marginBottom: 3 },
  cardSubtitle: { fontSize: 13, color: '#5C7A6F', marginBottom: 10 },
  textInput: {
    backgroundColor: '#F7F9F6', borderRadius: 12, padding: 14, fontSize: 15,
    color: '#1A2D26', minHeight: 100, borderWidth: 1, borderColor: '#E0E6E2',
  },

  // Chips
  chipsTitle: { fontSize: 14, fontWeight: '600', color: '#1A2D26', marginBottom: 8 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  chip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2',
    borderRadius: 16, paddingVertical: 6, paddingHorizontal: 10,
    marginRight: 6, marginBottom: 6, gap: 4,
  },
  chipSelected: { backgroundColor: '#2C5F78' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#2C5F78' },
  chipTextSelected: { color: '#FFFFFF' },

  // Buttons
  primaryBtn: {
    backgroundColor: '#D14953', borderRadius: 24, paddingVertical: 16,
    paddingHorizontal: 24, alignItems: 'center', flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1,
    shadowRadius: 4, elevation: 3,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  btnRow: { flexDirection: 'row', alignItems: 'center' },

  // Diary Button
  diaryButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 14, padding: 10, marginBottom: 8, gap: 10,
    borderWidth: 1, borderColor: '#D4E7DC',
  },
  diaryIconWrap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#E3F0F7',
    justifyContent: 'center', alignItems: 'center',
  },
  diaryBtnTitle: { fontSize: 14, fontWeight: '700', color: '#1A2D26' },
  diaryBtnSub: { fontSize: 12, color: '#5C7A6F', marginTop: 1 },

  // Onboarding Button
  onboardingButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#D14953',
    borderRadius: 12, padding: 8, marginBottom: 5, gap: 8,
  },
  onboardingIconWrap: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: '#3A7A60',
    justifyContent: 'center', alignItems: 'center',
  },
  onboardingBtnTitle: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  onboardingBtnSub: { fontSize: 11, color: '#D4E7DC', marginTop: 0 },

  // Supplement Plan Button
  supplementPlanButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#2D5A8B',
    borderRadius: 12, padding: 8, marginBottom: 5, gap: 8,
  },
  supplementPlanIconWrap: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: '#1E4A7A',
    justifyContent: 'center', alignItems: 'center',
  },
  supplementPlanBtnTitle: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  supplementPlanBtnSub: { fontSize: 11, color: '#B8D4E8', marginTop: 0 },

  // Progress Button
  progressButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#6B4E8B',
    borderRadius: 12, padding: 8, marginBottom: 5, gap: 8,
  },
  progressIconWrap: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: '#5A3D7A',
    justifyContent: 'center', alignItems: 'center',
  },
  progressBtnTitle: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  progressBtnSub: { fontSize: 11, color: '#D4C8E8', marginTop: 0 },

  // Alert Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  alertCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28, alignItems: 'center', width: '100%', maxWidth: 360 },
  alertTitle: { fontSize: 18, fontWeight: '700', color: '#1A2D26', marginTop: 14, textAlign: 'center' },
  alertText: { fontSize: 14, color: '#5C7A6F', marginTop: 10, textAlign: 'center', lineHeight: 22 },
  alertBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#D14953', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 20, marginTop: 20, width: '100%' },
  alertBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  alertDismiss: { marginTop: 12, paddingVertical: 8 },
  alertDismissText: { color: '#8FA39B', fontSize: 14 },

  // Footer
  footerWrap: {
    flexDirection: 'row', alignItems: 'flex-start', marginTop: 12, paddingHorizontal: 8, gap: 6,
  },
  footerText: { fontSize: 12, color: '#8FA39B', flex: 1, lineHeight: 18 },

  // Disclaimer
  disclaimerContainer: { padding: 24, paddingTop: 48, alignItems: 'center' },
  langSwitcher: {
    flexDirection: 'row', gap: 8, marginBottom: 20,
  },
  langBtn: {
    paddingVertical: 8, paddingHorizontal: 20, borderRadius: 16,
    backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#D4E7DC',
  },
  langBtnActive: { backgroundColor: '#2C5F78', borderColor: '#2C5F78' },
  langBtnText: { fontSize: 15, fontWeight: '700', color: '#2C5F78' },
  langBtnTextActive: { color: '#FFFFFF' },
  disclaimerIconWrap: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#FEE2E2',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  disclaimerTitle: { fontSize: 26, fontWeight: '700', color: '#1A2D26', marginBottom: 4 },
  disclaimerSubtitle: { fontSize: 15, color: '#5C7A6F', marginBottom: 24 },
  disclaimerCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: '100%',
    marginBottom: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  disclaimerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  disclaimerBold: { fontSize: 16, fontWeight: '700', color: '#1A2D26' },
  disclaimerText: { fontSize: 14, color: '#5C7A6F', lineHeight: 22, paddingLeft: 30 },

  // Recipe Catalog Button
  recipeCatalogButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#2D7A5A',
    borderRadius: 12, padding: 8, marginBottom: 5, gap: 8,
  },
  recipeCatalogIconWrap: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: '#1E6A4A',
    justifyContent: 'center', alignItems: 'center',
  },
  recipeCatalogBtnTitle: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  recipeCatalogBtnSub: { fontSize: 11, color: '#D4E8DC', marginTop: 0 },
});
