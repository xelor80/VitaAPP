import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Animated, StyleSheet,
  Dimensions, Modal, ScrollView, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGuide } from '../src/GuideContext';
import { useLang } from '../src/LangContext';
import { GUIDE_SCREENS, ONBOARDING_TOUR, t } from '../src/guideData';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Mascot States ───
type MascotState = 'idle' | 'highlight' | 'explaining' | 'success';

const STATE_COLORS: Record<MascotState, string> = {
  idle: '#4A8B71',
  highlight: '#2D5A8B',
  explaining: '#4A8B71',
  success: '#10B981',
};

const STATE_ICONS: Record<MascotState, string> = {
  idle: 'leaf',
  highlight: 'lightbulb-on-outline',
  explaining: 'message-text-outline',
  success: 'check-circle-outline',
};

interface Props {
  currentRoute: string;
  firstName?: string | null;
}

export function GuideMascot({ currentRoute, firstName }: Props) {
  const { lang } = useLang();
  const guide = useGuide();
  const [panelOpen, setPanelOpen] = useState(false);
  const [mascotState, setMascotState] = useState<MascotState>('idle');
  const [activeResponse, setActiveResponse] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const screenData = GUIDE_SCREENS[currentRoute] || GUIDE_SCREENS['/'];

  // Start onboarding tour for new users
  useEffect(() => {
    if (!guide.onboardingComplete && currentRoute === '/') {
      const timer = setTimeout(() => setShowOnboarding(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [guide.onboardingComplete, currentRoute]);

  // Subtle pulse animation for highlight state
  useEffect(() => {
    if (mascotState === 'highlight') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [mascotState, pulseAnim]);

  // Fade in on mount
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay: 800, useNativeDriver: true }).start();
  }, [fadeAnim]);

  // Change state based on route changes
  useEffect(() => {
    setMascotState('highlight');
    setActiveResponse(null);
    const timer = setTimeout(() => setMascotState('idle'), 3000);
    return () => clearTimeout(timer);
  }, [currentRoute]);

  if (!guide.guideVisible) return null;

  const greeting = firstName
    ? `${firstName}, ${t(screenData.greeting, lang).toLowerCase()}`
    : t(screenData.greeting, lang);

  const handleQuickAction = (responseText: string) => {
    setActiveResponse(responseText);
    setMascotState('explaining');
  };

  const handleClose = () => {
    setPanelOpen(false);
    setActiveResponse(null);
    setMascotState('idle');
  };

  return (
    <>
      {/* Floating Mascot Bubble */}
      <Animated.View style={[s.bubbleContainer, { opacity: fadeAnim, transform: [{ scale: pulseAnim }] }]}>
        <TouchableOpacity
          style={[s.bubble, { backgroundColor: STATE_COLORS[mascotState] }]}
          onPress={() => setPanelOpen(true)}
          activeOpacity={0.8}
          data-testid="guide-mascot-bubble"
        >
          <MaterialCommunityIcons
            name={STATE_ICONS[mascotState] as any}
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>
        {mascotState === 'highlight' && (
          <View style={s.badge}>
            <View style={s.badgeDot} />
          </View>
        )}
      </Animated.View>

      {/* Guide Panel Modal */}
      <Modal
        visible={panelOpen}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
      >
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={handleClose}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={s.panel}>
              {/* Panel Header */}
              <View style={s.panelHeader}>
                <View style={s.panelHeaderLeft}>
                  <View style={s.panelIcon}>
                    <MaterialCommunityIcons name="leaf" size={18} color="#4A8B71" />
                  </View>
                  <Text style={s.panelTitle}>VitaGuide</Text>
                </View>
                <View style={s.panelHeaderActions}>
                  <TouchableOpacity
                    onPress={() => { guide.dismissTemporarily(); handleClose(); }}
                    style={s.dismissBtn}
                    data-testid="guide-dismiss-btn"
                  >
                    <Text style={s.dismissText}>
                      {lang === 'de' ? 'Spaeter' : 'Dopo'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleClose} data-testid="guide-close-btn">
                    <MaterialCommunityIcons name="close" size={22} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView style={s.panelBody} showsVerticalScrollIndicator={false}>
                {/* Greeting */}
                <View style={s.messageBox}>
                  <MaterialCommunityIcons name="leaf" size={16} color="#4A8B71" style={{ marginTop: 2 }} />
                  <Text style={s.messageText}>{greeting}</Text>
                </View>

                {/* Active Response */}
                {activeResponse && (
                  <View style={s.responseBox}>
                    <Text style={s.responseText}>{activeResponse}</Text>
                  </View>
                )}

                {/* Quick Actions */}
                {screenData.quickActions.length > 0 && (
                  <View style={s.quickActionsSection}>
                    <Text style={s.sectionLabel}>
                      {lang === 'de' ? 'Haeufige Fragen' : 'Domande frequenti'}
                    </Text>
                    {screenData.quickActions.map(action => (
                      <TouchableOpacity
                        key={action.id}
                        style={s.quickActionBtn}
                        onPress={() => handleQuickAction(t(action.response, lang))}
                        data-testid={`guide-action-${action.id}`}
                      >
                        <MaterialCommunityIcons name="help-circle-outline" size={16} color="#4A8B71" />
                        <Text style={s.quickActionText}>{t(action.label, lang)}</Text>
                        <MaterialCommunityIcons name="chevron-right" size={16} color="#94A3B8" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Next Step */}
                <View style={s.nextStepBox}>
                  <MaterialCommunityIcons name="arrow-right-circle-outline" size={16} color="#2D5A8B" style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.nextStepLabel}>
                      {lang === 'de' ? 'Naechster Schritt' : 'Prossimo passo'}
                    </Text>
                    <Text style={s.nextStepText}>{t(screenData.nextStep, lang)}</Text>
                  </View>
                </View>

                {/* Hide Guide Option */}
                <TouchableOpacity
                  style={s.hideBtn}
                  onPress={() => { guide.hideGuide(); handleClose(); }}
                  data-testid="guide-hide-btn"
                >
                  <MaterialCommunityIcons name="eye-off-outline" size={14} color="#94A3B8" />
                  <Text style={s.hideText}>
                    {lang === 'de' ? 'Guide ausblenden' : 'Nascondi guida'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Onboarding Tour */}
      {showOnboarding && !guide.onboardingComplete && (
        <OnboardingTourModal
          lang={lang}
          firstName={firstName}
          onComplete={() => {
            guide.completeOnboarding();
            setShowOnboarding(false);
          }}
          onSkip={() => {
            guide.completeOnboarding();
            setShowOnboarding(false);
          }}
        />
      )}
    </>
  );
}

// ─── Onboarding Tour Modal ───
function OnboardingTourModal({
  lang, firstName, onComplete, onSkip,
}: {
  lang: 'de' | 'it';
  firstName?: string | null;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const current = ONBOARDING_TOUR[step];
  const isLast = step === ONBOARDING_TOUR.length - 1;

  const animateTransition = (nextStep: number) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setStep(nextStep);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={s.overlay}>
        <View style={s.onboardingCard}>
          {/* Progress Dots */}
          <View style={s.dots}>
            {ONBOARDING_TOUR.map((_, i) => (
              <View key={i} style={[s.dot, i === step && s.dotActive]} />
            ))}
          </View>

          <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
            {/* Icon */}
            <View style={s.onboardingIconWrap}>
              <MaterialCommunityIcons
                name={current.icon as any}
                size={28}
                color="#4A8B71"
              />
            </View>

            {/* Title */}
            <Text style={s.onboardingTitle}>
              {step === 0 && firstName
                ? `${firstName}, ${t(current.title, lang).toLowerCase()}`
                : t(current.title, lang)}
            </Text>

            {/* Text */}
            <Text style={s.onboardingText}>{t(current.text, lang)}</Text>
          </Animated.View>

          {/* Actions */}
          <View style={s.onboardingActions}>
            <TouchableOpacity onPress={onSkip} style={s.skipBtn} data-testid="onboarding-tour-skip">
              <Text style={s.skipText}>
                {lang === 'de' ? 'Ueberspringen' : 'Salta'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.nextBtn}
              onPress={() => isLast ? onComplete() : animateTransition(step + 1)}
              data-testid="onboarding-tour-next"
            >
              <Text style={s.nextBtnText}>
                {isLast
                  ? (lang === 'de' ? 'Los geht\'s' : 'Iniziamo')
                  : (lang === 'de' ? 'Weiter' : 'Avanti')}
              </Text>
              <MaterialCommunityIcons
                name={isLast ? 'check' : 'arrow-right'}
                size={18}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>

          {/* Step counter */}
          <Text style={s.stepCounter}>{step + 1} / {ONBOARDING_TOUR.length}</Text>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───
const s = StyleSheet.create({
  // Floating Bubble
  bubbleContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 24 : 40,
    right: 16,
    zIndex: 999,
  },
  bubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },

  // Overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },

  // Guide Panel
  panel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: Dimensions.get('window').height * 0.6,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  panelHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  panelIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2D26',
  },
  panelHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dismissBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  dismissText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  // Panel Body
  panelBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  messageBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#F0FAF4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    color: '#1A2D26',
    lineHeight: 21,
  },
  responseBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4A8B71',
  },
  responseText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },

  // Quick Actions
  quickActionsSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: '#F7F9F6',
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E8F5E9',
  },
  quickActionText: {
    flex: 1,
    fontSize: 13,
    color: '#1A2D26',
    fontWeight: '500',
  },

  // Next Step
  nextStepBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  nextStepLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2D5A8B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  nextStepText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },

  // Hide
  hideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 4,
  },
  hideText: {
    fontSize: 12,
    color: '#94A3B8',
  },

  // Onboarding Tour
  onboardingCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 60,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  dotActive: {
    backgroundColor: '#4A8B71',
    width: 20,
  },
  onboardingIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  onboardingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2D26',
    textAlign: 'center',
    marginBottom: 10,
  },
  onboardingText: {
    fontSize: 14,
    color: '#5C7A6F',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  onboardingActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4A8B71',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepCounter: {
    marginTop: 16,
    fontSize: 12,
    color: '#94A3B8',
  },
});
