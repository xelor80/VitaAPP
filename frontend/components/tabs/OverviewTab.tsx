import React from 'react';
import { View, Text, Image, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { styles as rs } from '../styles/resultsStyles';
import { TTSButton } from '../TTSButton';

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  hoch:    { label: 'Hohe Priorität',    color: '#D9534F', bg: '#FDF2F2', icon: 'alert-circle' },
  mittel:  { label: 'Mittlere Priorität', color: '#D97706', bg: '#FFFBEB', icon: 'alert-outline' },
  niedrig: { label: 'Niedrige Priorität', color: '#4A8B71', bg: '#E8F5E9', icon: 'check-circle-outline' },
  alta:    { label: 'Alta priorità',      color: '#D9534F', bg: '#FDF2F2', icon: 'alert-circle' },
  media:   { label: 'Media priorità',     color: '#D97706', bg: '#FFFBEB', icon: 'alert-outline' },
  bassa:   { label: 'Bassa priorità',     color: '#4A8B71', bg: '#E8F5E9', icon: 'check-circle-outline' },
};

const TX = {
  de: {
    sec1: '1. Zusammenfassung',
    sec2: '2. Wahrscheinliche Ursachen',
    sec3: '3. Empfohlene Strategie',
    sec4: '4. Erwarteter Zeitraum bis Wirkung',
    sec5: '5. Sicherheitshinweise',
    priority: 'Priorität',
    deficiencyTitle: 'Möglicher Mangel',
    evidence: 'Evidenz',
    mechanism: 'Wirkmechanismus',
    dosage: 'Dosierung',
    timing: 'Einnahmezeitpunkt',
    product: 'Qualitaetsgepruefte Option',
    reason: 'Begründung',
    shortTerm: 'Kurzfristig (1–2 Wochen)',
    medTerm: 'Mittelfristig (4–8 Wochen)',
    note: 'Hinweis',
    adLabel: 'Werbung',
    shopBtn: 'Optionen vergleichen',
    sources: 'Natürliche Quellen',
    disclaimerTitle: 'Rechtlicher Hinweis',
  },
  it: {
    sec1: '1. Riepilogo',
    sec2: '2. Cause probabili',
    sec3: '3. Strategia raccomandata',
    sec4: '4. Tempi previsti per l\'effetto',
    sec5: '5. Avvertenze di sicurezza',
    priority: 'Priorità',
    deficiencyTitle: 'Possibile carenza',
    evidence: 'Evidenza',
    mechanism: 'Meccanismo d\'azione',
    dosage: 'Dosaggio',
    timing: 'Momento di assunzione',
    product: 'Opzione verificata',
    reason: 'Motivazione',
    shortTerm: 'A breve termine (1–2 settimane)',
    medTerm: 'A medio termine (4–8 settimane)',
    note: 'Nota',
    adLabel: 'Pubblicità',
    shopBtn: 'Confronta opzioni',
    sources: 'Fonti naturali',
    disclaimerTitle: 'Avviso legale',
  },
};

export function OverviewTab({ analysis, onShopPress, lang }: { analysis: any; onShopPress: (id: string, url: string) => void; lang: string }) {
  const tx = TX[lang as keyof typeof TX] || TX.de;
  const priority = analysis.priority_level || 'mittel';
  const pCfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.mittel;
  const depth = analysis.analysis_depth || {};
  const timeline = analysis.improvement_timeline || {};

  // Build TTS text from summary + symptoms + causes
  const ttsText = React.useMemo(() => {
    const parts: string[] = [];
    if (analysis.summary) parts.push(analysis.summary);
    if (depth.identified_symptoms?.length) {
      parts.push(
        lang === 'de' ? 'Identifizierte Symptome:' : 'Sintomi identificati:',
        depth.identified_symptoms.join(', ')
      );
    }
    if (depth.possible_causes?.length) {
      parts.push(
        lang === 'de' ? 'Wahrscheinliche Ursachen:' : 'Cause probabili:',
        depth.possible_causes.join('. ')
      );
    }
    return parts.join(' ');
  }, [analysis, depth, lang]);

  return (
    <View testID="medical-report">
      {/* ── SECTION 1: ZUSAMMENFASSUNG ─────────────────── */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <View style={[s.sectionNum, { backgroundColor: '#4A8B71' }]}>
            <Text style={s.sectionNumText}>1</Text>
          </View>
          <Text style={s.sectionTitle}>{tx.sec1}</Text>
          <View style={{ flex: 1 }} />
          {ttsText.length > 0 && (
            <TTSButton text={ttsText} lang={lang} testID="analysis-tts-btn" />
          )}
        </View>

        {/* Priority Badge */}
        <View style={[s.priorityBadge, { backgroundColor: pCfg.bg }]}>
          <MaterialCommunityIcons name={pCfg.icon as any} size={18} color={pCfg.color} />
          <Text style={[s.priorityText, { color: pCfg.color }]}>{pCfg.label}</Text>
        </View>

        <Text style={s.summaryText}>{analysis.summary}</Text>

        {/* Identified Symptoms */}
        {depth.identified_symptoms?.length > 0 && (
          <View style={s.bulletList}>
            {depth.identified_symptoms.map((sym: string, i: number) => (
              <View key={i} style={s.bulletRow}>
                <View style={s.bullet} />
                <Text style={s.bulletText}>{sym}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ── SECTION 2: WAHRSCHEINLICHE URSACHEN ───────── */}
      {(analysis.supplements_general_info?.length > 0 || depth.possible_causes?.length > 0) && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionNum, { backgroundColor: '#2C5F78' }]}>
              <Text style={s.sectionNumText}>2</Text>
            </View>
            <Text style={s.sectionTitle}>{tx.sec2}</Text>
          </View>

          {/* Possible Causes from analysis_depth */}
          {depth.possible_causes?.length > 0 && (
            <View style={s.bulletList}>
              {depth.possible_causes.map((cause: string, i: number) => (
                <View key={i} style={s.bulletRow}>
                  <MaterialCommunityIcons name="arrow-right-thin" size={16} color="#2C5F78" />
                  <Text style={s.bulletText}>{cause}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Deficiency Cards */}
          {analysis.supplements_general_info?.map((sup: any, i: number) => (
            <View key={i} style={s.deficiencyCard}>
              <View style={s.deficiencyHeader}>
                <MaterialCommunityIcons name="flask-outline" size={16} color="#2C5F78" />
                <Text style={s.deficiencyName}>{sup.nutrient}</Text>
                {sup.evidence_level && (
                  <View style={[s.evidenceBadge,
                    sup.evidence_level === 'hoch' || sup.evidence_level === 'alta' ? { backgroundColor: '#DCF5E7' } :
                    sup.evidence_level === 'mittel' || sup.evidence_level === 'media' ? { backgroundColor: '#FEF3CD' } :
                    { backgroundColor: '#F0F4F1' }
                  ]}>
                    <Text style={s.evidenceText}>
                      {tx.evidence}: {sup.evidence_level === 'hoch' || sup.evidence_level === 'alta' ? (lang === 'de' ? 'Stark' : 'Alta') :
                        sup.evidence_level === 'mittel' || sup.evidence_level === 'media' ? (lang === 'de' ? 'Mittel' : 'Media') :
                        (lang === 'de' ? 'Gering' : 'Bassa')}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={s.deficiencyReason}>{sup.why}</Text>
              {sup.mechanism && (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>{tx.mechanism}:</Text>
                  <Text style={s.infoValue}>{sup.mechanism}</Text>
                </View>
              )}
              {sup.food_sources?.length > 0 && (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>{tx.sources}:</Text>
                  <Text style={s.infoValue}>{sup.food_sources.join(', ')}</Text>
                </View>
              )}
              {sup.cautions && (
                <View style={s.cautionBox}>
                  <MaterialCommunityIcons name="alert-outline" size={13} color="#D9534F" />
                  <Text style={s.cautionText}>{sup.cautions}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* ── SECTION 3: EMPFOHLENE STRATEGIE ───────────── */}
      {(analysis.supplement_schedule?.length > 0 || analysis.brand_products?.length > 0) && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionNum, { backgroundColor: '#4A8B71' }]}>
              <Text style={s.sectionNumText}>3</Text>
            </View>
            <Text style={s.sectionTitle}>{tx.sec3}</Text>
          </View>

          {/* Schedule Items */}
          {analysis.supplement_schedule?.map((item: any, i: number) => (
            <View key={i} style={s.strategyCard}>
              <View style={s.strategyHeader}>
                <View style={s.strategyTimeBadge}>
                  <MaterialCommunityIcons
                    name={item.time?.includes('Morgens') || item.time?.includes('Mattina') ? 'weather-sunset-up' :
                      item.time?.includes('Mittags') || item.time?.includes('Mezzogiorno') ? 'white-balance-sunny' :
                      item.time?.includes('Abends') || item.time?.includes('Sera') ? 'weather-sunset-down' :
                      'weather-night' as any}
                    size={16} color="#4A8B71"
                  />
                  <Text style={s.strategyTimeText}>{item.time}</Text>
                </View>
              </View>
              <Text style={s.strategyProduct}>{item.product_name}</Text>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>{tx.dosage}:</Text>
                <Text style={s.infoValue}>{item.dosage}</Text>
              </View>
              {item.instruction && (
                <Text style={s.strategyInstruction}>{item.instruction}</Text>
              )}
              {item.why_this_time && (
                <Text style={s.strategyWhy}>{item.why_this_time}</Text>
              )}
            </View>
          ))}

          {/* Brand Products */}
          {analysis.brand_products?.map((p: any, i: number) => (
            <View key={i} style={s.productCard}>
              <View style={s.productHeader}>
                {p.image_url ? (
                  <Image source={{ uri: p.image_url }} style={s.productImg} resizeMode="contain" />
                ) : (
                  <View style={s.productImgPlaceholder}>
                    <MaterialCommunityIcons name="package-variant-closed" size={20} color="#4A8B71" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.productName}>{p.name}</Text>
                    <Text style={s.adLabel}>{tx.adLabel}</Text>
                  </View>
                  {p.price && <Text style={s.productPrice}>{p.price}</Text>}
                </View>
              </View>
              <Text style={s.productReason}>{p.reason}</Text>
              {p.dosage_from_label && (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>{tx.dosage}:</Text>
                  <Text style={s.infoValue}>{p.dosage_from_label}</Text>
                </View>
              )}
              {p.note && (
                <View style={s.cautionBox}>
                  <MaterialCommunityIcons name="information-outline" size={13} color="#2C5F78" />
                  <Text style={s.cautionText}>{p.note}</Text>
                </View>
              )}
              {p.affiliate_url && (
                <TouchableOpacity testID={`report-shop-${p.product_id}`} style={s.shopBtn} onPress={() => onShopPress(p.product_id, p.affiliate_url)}>
                  <MaterialCommunityIcons name="open-in-new" size={14} color="#FFF" />
                  <Text style={s.shopBtnText}>{tx.shopBtn}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {/* ── SECTION 4: ERWARTETER ZEITRAUM ────────────── */}
      {(timeline.short_term || timeline.medium_term) && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionNum, { backgroundColor: '#6B4E8B' }]}>
              <Text style={s.sectionNumText}>4</Text>
            </View>
            <Text style={s.sectionTitle}>{tx.sec4}</Text>
          </View>

          {timeline.short_term && (
            <View style={s.timelineRow}>
              <MaterialCommunityIcons name="clock-fast" size={18} color="#D97706" />
              <View style={{ flex: 1 }}>
                <Text style={s.timelineLabel}>{tx.shortTerm}</Text>
                <Text style={s.timelineText}>{timeline.short_term}</Text>
              </View>
            </View>
          )}
          {timeline.medium_term && (
            <View style={s.timelineRow}>
              <MaterialCommunityIcons name="calendar-check" size={18} color="#4A8B71" />
              <View style={{ flex: 1 }}>
                <Text style={s.timelineLabel}>{tx.medTerm}</Text>
                <Text style={s.timelineText}>{timeline.medium_term}</Text>
              </View>
            </View>
          )}
          {timeline.note && (
            <View style={[s.cautionBox, { marginTop: 8 }]}>
              <MaterialCommunityIcons name="information-outline" size={13} color="#5C7A6F" />
              <Text style={s.cautionText}>{timeline.note}</Text>
            </View>
          )}
        </View>
      )}

      {/* ── SECTION 5: SICHERHEITSHINWEISE ────────────── */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <View style={[s.sectionNum, { backgroundColor: '#D9534F' }]}>
            <Text style={s.sectionNumText}>5</Text>
          </View>
          <Text style={s.sectionTitle}>{tx.sec5}</Text>
        </View>

        {analysis.red_flags?.map((rf: any, i: number) => (
          <View key={i} testID={`report-redflag-${i}`} style={s.redFlagRow}>
            <MaterialCommunityIcons name="alert-circle" size={16} color="#D9534F" />
            <View style={{ flex: 1 }}>
              <Text style={s.redFlagTitle}>{rf.flag}</Text>
              <Text style={s.redFlagAction}>{rf.action}</Text>
            </View>
          </View>
        ))}

        <View style={s.disclaimerBox}>
          <MaterialCommunityIcons name="shield-check-outline" size={16} color="#5C7A6F" />
          <Text style={s.disclaimerTitle}>{tx.disclaimerTitle}</Text>
        </View>
        <Text style={s.disclaimerText}>
          {analysis.disclaimer_short || (lang === 'de'
            ? 'Diese Informationen dienen der allgemeinen Orientierung und ersetzen keine ärztliche Beratung.'
            : 'Queste informazioni sono solo a scopo orientativo e non sostituiscono il parere medico.')}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // Sections
  section: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#E0E6E2',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionNum: {
    width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center',
  },
  sectionNumText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A2D26' },

  // Priority
  priorityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12, marginBottom: 12, alignSelf: 'flex-start',
  },
  priorityText: { fontSize: 13, fontWeight: '700' },

  // Summary
  summaryText: { fontSize: 15, color: '#1A2D26', lineHeight: 23 },

  // Bullets
  bulletList: { marginTop: 10 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4A8B71', marginTop: 7 },
  bulletText: { fontSize: 14, color: '#1A2D26', flex: 1, lineHeight: 20 },

  // Deficiency Cards
  deficiencyCard: {
    backgroundColor: '#F7F9F6', borderRadius: 12, padding: 14, marginTop: 10,
    borderLeftWidth: 3, borderLeftColor: '#2C5F78',
  },
  deficiencyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  deficiencyName: { fontSize: 15, fontWeight: '700', color: '#1A2D26' },
  deficiencyReason: { fontSize: 14, color: '#1A2D26', lineHeight: 20, marginBottom: 6 },
  evidenceBadge: { borderRadius: 8, paddingVertical: 2, paddingHorizontal: 8 },
  evidenceText: { fontSize: 11, fontWeight: '600', color: '#5C7A6F' },

  // Info Rows
  infoRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  infoLabel: { fontSize: 13, fontWeight: '700', color: '#5C7A6F' },
  infoValue: { fontSize: 13, color: '#1A2D26', flex: 1 },

  // Caution
  cautionBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8,
    backgroundColor: '#FFF8F0', borderRadius: 8, padding: 8,
  },
  cautionText: { fontSize: 12, color: '#5C7A6F', flex: 1, lineHeight: 17 },

  // Strategy Cards
  strategyCard: {
    backgroundColor: '#F7F9F6', borderRadius: 12, padding: 14, marginTop: 10,
    borderLeftWidth: 3, borderLeftColor: '#4A8B71',
  },
  strategyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  strategyTimeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E8F5E9', borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10,
  },
  strategyTimeText: { fontSize: 13, fontWeight: '700', color: '#4A8B71' },
  strategyProduct: { fontSize: 15, fontWeight: '700', color: '#1A2D26', marginBottom: 4 },
  strategyInstruction: { fontSize: 13, color: '#5C7A6F', marginTop: 4, lineHeight: 18 },
  strategyWhy: { fontSize: 12, color: '#8FA39B', marginTop: 4, fontStyle: 'italic' },

  // Product Cards
  productCard: {
    backgroundColor: '#F7F9F6', borderRadius: 12, padding: 14, marginTop: 10,
  },
  productHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  productImg: { width: 50, height: 50, borderRadius: 8 },
  productImgPlaceholder: {
    width: 50, height: 50, borderRadius: 8, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center',
  },
  productName: { fontSize: 15, fontWeight: '700', color: '#1A2D26' },
  productPrice: { fontSize: 13, color: '#4A8B71', fontWeight: '600', marginTop: 2 },
  adLabel: { fontSize: 10, color: '#8FA39B', fontWeight: '600', backgroundColor: '#F0F4F1', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  productReason: { fontSize: 14, color: '#1A2D26', lineHeight: 20 },
  shopBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#4A8B71', borderRadius: 10, paddingVertical: 10, marginTop: 10,
  },
  shopBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  // Timeline
  timelineRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12,
    backgroundColor: '#F7F9F6', borderRadius: 10, padding: 12,
  },
  timelineLabel: { fontSize: 13, fontWeight: '700', color: '#1A2D26', marginBottom: 2 },
  timelineText: { fontSize: 14, color: '#5C7A6F', lineHeight: 20 },

  // Red Flags
  redFlagRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10,
    backgroundColor: '#FDF2F2', borderRadius: 10, padding: 12,
  },
  redFlagTitle: { fontSize: 14, fontWeight: '700', color: '#D9534F' },
  redFlagAction: { fontSize: 13, color: '#721C24', marginTop: 2, lineHeight: 18 },

  // Disclaimer
  disclaimerBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  disclaimerTitle: { fontSize: 14, fontWeight: '700', color: '#5C7A6F' },
  disclaimerText: { fontSize: 13, color: '#8FA39B', lineHeight: 19 },
});
