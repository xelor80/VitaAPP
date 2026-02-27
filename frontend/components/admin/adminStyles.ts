import { StyleSheet } from 'react-native';

export const adminStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155'
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#F8FAFC' },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8,
    backgroundColor: '#334155'
  },
  backBtnText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  
  // Stats Cards
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  statCard: {
    backgroundColor: '#1E293B', borderRadius: 12, padding: 16,
    minWidth: 140, borderWidth: 1, borderColor: '#334155'
  },
  statValue: { fontSize: 28, fontWeight: '700', color: '#F8FAFC' },
  statLabel: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  
  // Tabs
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  tab: {
    paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8,
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155'
  },
  tabActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
  tabTextActive: { color: '#FFFFFF' },
  
  // Language Toggle
  langToggle: { flexDirection: 'row', marginLeft: 16, gap: 4 },
  langBtn: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6,
    backgroundColor: '#334155'
  },
  langBtnActive: { backgroundColor: '#10B981' },
  langBtnText: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  langBtnTextActive: { color: '#FFFFFF' },
  
  // Content
  content: { flex: 1, padding: 16 },
  
  // Table
  tableHeader: {
    flexDirection: 'row', backgroundColor: '#1E293B', padding: 12,
    borderTopLeftRadius: 8, borderTopRightRadius: 8, borderWidth: 1, borderColor: '#334155'
  },
  tableHeaderCell: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' },
  tableRow: {
    flexDirection: 'row', padding: 12, backgroundColor: '#0F172A',
    borderWidth: 1, borderTopWidth: 0, borderColor: '#334155'
  },
  tableCell: { fontSize: 14, color: '#E2E8F0' },
  tableCellSmall: { fontSize: 12, color: '#94A3B8' },
  
  // Actions
  actionBtn: {
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6,
    marginRight: 6
  },
  editBtn: { backgroundColor: '#3B82F6' },
  deleteBtn: { backgroundColor: '#EF4444' },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  
  // Add Button
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8,
    backgroundColor: '#10B981', alignSelf: 'flex-start', marginBottom: 16
  },
  addBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  
  // Modal
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#1E293B', borderRadius: 16, padding: 24,
    width: '90%', maxWidth: 600, maxHeight: '90%'
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#F8FAFC', marginBottom: 20 },
  
  // Form
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '600', color: '#94A3B8', marginBottom: 6 },
  formInput: {
    backgroundColor: '#0F172A', borderRadius: 8, padding: 12,
    fontSize: 14, color: '#F8FAFC', borderWidth: 1, borderColor: '#334155'
  },
  formTextarea: { minHeight: 80, textAlignVertical: 'top' },
  
  // Buttons
  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 20 },
  cancelBtn: {
    paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8,
    backgroundColor: '#334155'
  },
  saveBtn: {
    paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8,
    backgroundColor: '#10B981'
  },
  btnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  
  // Search
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  searchInput: {
    flex: 1, backgroundColor: '#1E293B', borderRadius: 8, padding: 12,
    fontSize: 14, color: '#F8FAFC', borderWidth: 1, borderColor: '#334155'
  },
  
  // Empty State
  emptyState: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#64748B', marginTop: 12 },
  
  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#94A3B8', marginTop: 12, fontSize: 14 },
});
