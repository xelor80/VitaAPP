/**
 * AbnehmGuideModal — Phase 1
 * Swipeable 6-card educational guide explaining the protein routine basics.
 * No medical claims, no brand names. Neutral, motivating, beginner-friendly.
 */
import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions,
  ScrollView, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useLang } from '../src/LangContext';
import { tx } from '../src/i18n';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - 32;

type Card = {
  id: string;
  icon: string;
  color: string;
  bg: string;
  title: { de: string; it: string; en: string };
  text: { de: string; it: string; en: string };
};

const CARDS: Card[] = [
  {
    id: 'protein',
    icon: 'dumbbell',
    color: '#B45309',
    bg: '#FEF3C7',
    title: { de: 'Warum Protein?', it: 'Perché proteine?', en: 'Why protein?' },
    text: {
      de: 'Protein hilft dir, länger satt zu bleiben und unterstützt deine Muskeln während des Kaloriendefizits.',
      it: 'Le proteine ti aiutano a sentirti sazio più a lungo e supportano i muscoli durante il deficit calorico.',
      en: 'Protein keeps you full longer and supports your muscles during a calorie deficit.',
    },
  },
  {
    id: 'hunger',
    icon: 'emoticon-happy-outline',
    color: '#6D28D9',
    bg: '#F3E8FF',
    title: { de: 'Weniger Heißhunger', it: 'Meno fame nervosa', en: 'Less cravings' },
    text: {
      de: 'Die Proteinphasen über den Tag helfen, starke Hungerattacken zu vermeiden.',
      it: 'Le fasi proteiche distribuite aiutano a evitare attacchi di fame.',
      en: 'Spread protein phases help you avoid strong hunger spikes.',
    },
  },
  {
    id: 'structure',
    icon: 'calendar-check',
    color: '#C2272F',
    bg: '#FEE2E2',
    title: { de: 'Struktur statt Verzicht', it: 'Struttura, non rinuncia', en: 'Structure, not denial' },
    text: {
      de: 'Ein klarer Tagesplan macht gesunde Ernährung einfacher und alltagstauglich.',
      it: 'Un piano chiaro rende il mangiare sano più semplice e quotidiano.',
      en: 'A clear daily plan makes healthy eating simpler and practical.',
    },
  },
  {
    id: 'water',
    icon: 'cup-water',
    color: '#0369A1',
    bg: '#E0F2FE',
    title: { de: 'Wasser nicht vergessen', it: "Non dimenticare l'acqua", en: "Don't forget water" },
    text: {
      de: 'Ausreichend Wasser unterstützt Energie, Sättigung und Stoffwechsel.',
      it: 'Acqua a sufficienza supporta energia, sazietà e metabolismo.',
      en: 'Enough water supports energy, satiety and metabolism.',
    },
  },
  {
    id: 'deficit',
    icon: 'scale-balance',
    color: '#BE185D',
    bg: '#FCE7F3',
    title: { de: 'Das Kaloriendefizit', it: 'Il deficit calorico', en: 'The calorie deficit' },
    text: {
      de: 'Ein kleines, gleichmäßiges Defizit ist nachhaltiger als extreme Diäten und entscheidet langfristig.',
      it: 'Un piccolo deficit costante è più sostenibile delle diete estreme.',
      en: 'A small, steady deficit beats extreme diets long-term.',
    },
  },
  {
    id: 'consistency',
    icon: 'trending-up',
    color: '#1D4ED8',
    bg: '#DBEAFE',
    title: { de: 'Konstanz schlägt Perfektion', it: 'Costanza batte perfezione', en: 'Consistency beats perfection' },
    text: {
      de: 'Ein Ausrutscher ist okay. Bleib einfach morgen dran – die Wochenbilanz zählt.',
      it: 'Uno sgarro va bene. Riprendi domani – conta la settimana.',
      en: 'A slip is fine. Just continue tomorrow – the weekly balance counts.',
    },
  },
];

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function AbnehmGuideModal({ visible, onClose }: Props) {
  const { lang } = useLang();
  const scrollRef = useRef<ScrollView>(null);
  const [idx, setIdx] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / CARD_W);
    if (i !== idx) setIdx(i);
  };

  const next = () => {
    if (idx >= CARDS.length - 1) { onClose(); return; }
    scrollRef.current?.scrollTo({ x: (idx + 1) * CARD_W, animated: true });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={st.backdrop}>
        <Animated.View entering={FadeIn.duration(250)} style={st.sheet}>
          <View style={st.header}>
            <Text style={st.headerTitle}>{tx(lang, { de: 'Abnehm-Guide', it: 'Guida dimagrante', en: 'Slim guide' })}</Text>
            <TouchableOpacity onPress={onClose} testID="abnehm-guide-close" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={CARD_W}
            testID="abnehm-guide-scroll"
          >
            {CARDS.map((c) => {
              const title = c.title[lang as 'de' | 'it' | 'en'] || c.title.de;
              const body = c.text[lang as 'de' | 'it' | 'en'] || c.text.de;
              return (
                <View key={c.id} style={[st.card, { width: CARD_W }]} testID={`abnehm-guide-card-${c.id}`}>
                  <View style={[st.iconWrap, { backgroundColor: c.bg }]}>
                    <MaterialCommunityIcons name={c.icon as any} size={56} color={c.color} />
                  </View>
                  <Text style={st.cardTitle}>{title}</Text>
                  <Text style={st.cardText}>{body}</Text>
                </View>
              );
            })}
          </ScrollView>

          {/* Dots */}
          <View style={st.dots}>
            {CARDS.map((_, i) => (
              <View key={i} style={[st.dot, i === idx && st.dotActive]} />
            ))}
          </View>

          <View style={st.footer}>
            <Text style={st.footerStep}>{idx + 1} / {CARDS.length}</Text>
            <TouchableOpacity style={st.nextBtn} onPress={next} testID="abnehm-guide-next-btn">
              <Text style={st.nextBtnText}>
                {idx >= CARDS.length - 1
                  ? tx(lang, { de: 'Fertig', it: 'Fatto', en: 'Done' })
                  : tx(lang, { de: 'Weiter', it: 'Avanti', en: 'Next' })}
              </Text>
              <MaterialCommunityIcons
                name={idx >= CARDS.length - 1 ? 'check' : 'arrow-right'}
                size={18}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 24,
    minHeight: 520,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  card: {
    paddingHorizontal: 28,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  cardText: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 10,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#E5E7EB' },
  dotActive: { backgroundColor: '#C2272F', width: 22 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 12,
  },
  footerStep: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#C2272F',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
  },
  nextBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
