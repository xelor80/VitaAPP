import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F9F6' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 40 },

  // Header
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E0E6E2',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A2D26' },

  // Red Flag Banner
  redFlagBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDF2F2',
    padding: 14, marginHorizontal: 16, marginTop: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#F5C6CB',
  },
  redFlagTitle: { fontSize: 15, fontWeight: '700', color: '#D9534F' },
  redFlagText: { fontSize: 13, color: '#721C24', marginTop: 2, lineHeight: 18 },

  // Tabs
  tabBar: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0E6E2' },
  tabScroll: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  tab: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 20, backgroundColor: '#F7F9F6', gap: 6,
  },
  tabActive: { backgroundColor: '#4A8B71' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#5C7A6F' },
  tabTextActive: { color: '#FFFFFF' },

  // Cards
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A2D26', flex: 1 },
  cardBody: { fontSize: 15, color: '#1A2D26', lineHeight: 22 },

  // Red flag card
  redFlagCard: {
    backgroundColor: '#FDF2F2', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#F5C6CB',
  },

  // Tips
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  tipText: { fontSize: 14, color: '#1A2D26', flex: 1, lineHeight: 20 },

  // Badge
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeHigh: { backgroundColor: '#E8F5E9' },
  badgeMed: { backgroundColor: '#FFF3E0' },
  badgeLow: { backgroundColor: '#FFEBEE' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#1A2D26' },

  // Caution
  cautionRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10,
    backgroundColor: '#FDF2F2', borderRadius: 8, padding: 10,
  },
  cautionText: { fontSize: 13, color: '#D9534F', flex: 1, lineHeight: 18 },

  // Sources
  sourcesWrap: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  sourcesLabel: { fontSize: 13, fontWeight: '600', color: '#5C7A6F' },
  sourcesText: { fontSize: 13, color: '#5C7A6F' },

  // Section
  sectionHeader: { marginTop: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A2D26' },
  sectionSubtitle: { fontSize: 13, color: '#8FA39B', marginTop: 2 },

  // Product Card
  productCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#E0E6E2',
  },
  productTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  productIcon: {
    width: 64, height: 64, borderRadius: 12, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center',
  },
  productImage: {
    width: 64, height: 64, borderRadius: 12, backgroundColor: '#F7F9F6',
  },
  productName: { fontSize: 16, fontWeight: '700', color: '#1A2D26' },
  productPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  productPrice: { fontSize: 15, fontWeight: '600', color: '#4A8B71' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 12, fontWeight: '600', color: '#5C7A6F' },
  productReason: { fontSize: 14, color: '#5C7A6F', lineHeight: 20, marginBottom: 4 },
  productNote: { fontSize: 13, color: '#8FA39B', fontStyle: 'italic', marginBottom: 10 },
  shopBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#2C5F78', borderRadius: 20, paddingVertical: 12, marginTop: 4,
  },
  shopBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  // Nutrition
  nutritionTipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14,
  },
  tipNumber: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center',
  },
  tipNumberText: { fontSize: 14, fontWeight: '700', color: '#4A8B71' },
  nutritionTipText: { fontSize: 15, color: '#1A2D26', flex: 1, lineHeight: 22 },

  // Recipes
  recipeCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  recipeContent: { padding: 14 },
  recipeTitle: { fontSize: 16, fontWeight: '700', color: '#1A2D26' },
  recipeMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  recipeTime: { fontSize: 13, color: '#5C7A6F' },
  recipeDot: { fontSize: 13, color: '#8FA39B', marginHorizontal: 6 },
  recipeIngCount: { fontSize: 13, color: '#5C7A6F' },
  recipeTagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 6 },
  recipeTag: { backgroundColor: '#E8F5E9', borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10 },
  recipeTagText: { fontSize: 12, fontWeight: '600', color: '#2C5F78' },
  // Recipe detail (expanded)
  recipeDetail: {
    paddingHorizontal: 14, paddingBottom: 14,
    borderTopWidth: 1, borderTopColor: '#F0F4F1',
  },
  recipeSection: { marginTop: 12 },
  recipeSectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A2D26', marginBottom: 8 },
  recipeIngRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  recipeIngText: { fontSize: 14, color: '#1A2D26', flex: 1 },
  recipeStepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  recipeStepNum: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center',
  },
  recipeStepNumText: { fontSize: 12, fontWeight: '700', color: '#4A8B71' },
  recipeStepText: { fontSize: 14, color: '#1A2D26', flex: 1, lineHeight: 20 },

  // Empty states
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyStateText: { fontSize: 15, color: '#8FA39B' },
  emptyText: { fontSize: 16, color: '#8FA39B', marginTop: 12 },
  linkBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20 },
  linkBtnText: { fontSize: 16, color: '#4A8B71', fontWeight: '600' },

  // Disclaimer footer
  disclaimerFooter: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 16,
    paddingVertical: 12, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: '#E0E6E2',
  },
  disclaimerText: { fontSize: 12, color: '#8FA39B', flex: 1, lineHeight: 18 },

  // Featured Product on Overview
  featuredProductCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#D4E7DC',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  featuredHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12,
  },
  featuredLabel: { fontSize: 14, fontWeight: '700', color: '#4A8B71', flex: 1 },
  featuredAdLabel: {
    fontSize: 10, fontWeight: '700', color: '#8FA39B',
    borderWidth: 1, borderColor: '#D0D5D2', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  featuredContent: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  featuredImage: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#F7F9F6' },
  featuredImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  featuredInfo: { flex: 1 },
  featuredName: { fontSize: 16, fontWeight: '700', color: '#1A2D26', marginBottom: 2 },
  featuredPrice: { fontSize: 15, fontWeight: '700', color: '#4A8B71', marginBottom: 4 },
  featuredReason: { fontSize: 13, color: '#5C7A6F', lineHeight: 18 },
  featuredShopBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#4A8B71', borderRadius: 20, paddingVertical: 12,
  },
  videoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF0F0', borderRadius: 20, paddingVertical: 10, marginTop: 6,
    borderWidth: 1, borderColor: '#F5D0D0',
  },
  videoBtnText: { fontSize: 13, fontWeight: '600', color: '#D9534F' },

  // Schedule styles
  scheduleSection: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
  },
  scheduleSubtitle: { fontSize: 13, color: '#8FA39B', marginBottom: 14, marginTop: -4 },
  scheduleCard: {
    flexDirection: 'row', marginBottom: 14, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0F4F1',
  },
  scheduleLeft: { alignItems: 'center', width: 72, gap: 6 },
  scheduleTimeIcon: {
    width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
  },
  scheduleTime: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  scheduleRight: { flex: 1, marginLeft: 10 },
  scheduleProductRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  scheduleProductImg: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#F7F9F6' },
  scheduleProductName: { fontSize: 15, fontWeight: '700', color: '#1A2D26' },
  scheduleDosage: { fontSize: 14, fontWeight: '600', color: '#4A8B71', marginTop: 1 },
  scheduleInstruction: { fontSize: 13, color: '#5C7A6F', marginTop: 4, lineHeight: 18 },
  officialInstructionRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6,
    backgroundColor: '#EFF6FB', borderRadius: 8, padding: 8,
  },
  officialInstructionText: { fontSize: 12, color: '#2C5F78', flex: 1, lineHeight: 17, fontStyle: 'italic' },
  scheduleShopLink: {
    flexDirection: 'row', alignItems: 'center', marginTop: 6,
  },
  scheduleShopText: { fontSize: 13, fontWeight: '600', color: '#4A8B71' },
  scheduleCaution: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4,
    backgroundColor: '#FFF8F0', borderRadius: 10, padding: 10,
  },
  scheduleCautionText: { fontSize: 12, color: '#D9534F', flex: 1, lineHeight: 18 },
});
