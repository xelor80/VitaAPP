import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Animated, StyleSheet,
  Dimensions, Modal, ScrollView, Platform, Image, Easing,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGuide } from '../src/GuideContext';
import { useLang } from '../src/LangContext';
import { GUIDE_SCREENS, ONBOARDING_TOUR, t, MascotPose } from '../src/guideData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// VERO mascot images - different poses
const VERO_IMAGES: Record<MascotPose, any> = {
  default: require('../assets/images/vero-hallo.png'),
  hallo: require('../assets/images/vero-hallo.png'),
  super: require('../assets/images/vero-super.png'),
  achtung: require('../assets/images/vero-achtung.png'),
  herz: require('../assets/images/vero-herz.png'),
};

// Helper to get the right image for a pose
function getVeroImage(pose: MascotPose) {
  return VERO_IMAGES[pose] || VERO_IMAGES.default;
}

// Mascot States
type MascotState = 'idle' | 'highlight' | 'explaining' | 'success';

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
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const panelSlideAnim = useRef(new Animated.Value(300)).current;
  const panelOpacityAnim = useRef(new Animated.Value(0)).current;

  const screenData = GUIDE_SCREENS[currentRoute] || GUIDE_SCREENS['/'];
  const currentPose = screenData.pose || 'default';
  const currentImage = getVeroImage(currentPose);

  // Start onboarding tour for new users
  useEffect(() => {
    if (!guide.onboardingComplete && currentRoute === '/') {
      const timer = setTimeout(() => setShowOnboarding(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [guide.onboardingComplete, currentRoute]);

  // Subtle pulse for highlight
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

  // Bounce-in on mount (elastic spring effect)
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: 600, useNativeDriver: true }),
      Animated.spring(bounceAnim, {
        toValue: 1,
        delay: 600,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, bounceAnim]);

  // Reset on route change
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

  const handleOpen = () => {
    setPanelOpen(true);
    panelSlideAnim.setValue(300);
    panelOpacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(panelSlideAnim, { toValue: 0, friction: 8, tension: 65, useNativeDriver: true }),
      Animated.timing(panelOpacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(panelSlideAnim, { toValue: 300, duration: 200, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      Animated.timing(panelOpacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setPanelOpen(false);
      setActiveResponse(null);
      setMascotState('idle');
    });
  };

  const bubbleBorderColor = mascotState === 'highlight' ? '#F59E0B' : '#4A8B71';

  return (
    <>
      {/* Floating VERO Mascot Bubble */}
      <Animated.View style={[s.bubbleContainer, { opacity: fadeAnim, transform: [{ scale: Animated.multiply(pulseAnim, bounceAnim) }] }]}>
        <TouchableOpacity
          style={[s.bubble, { borderColor: bubbleBorderColor }]}
          onPress={handleOpen}
          activeOpacity={0.85}
          data-testid="guide-mascot-bubble"
        >
          <Image source={currentImage} style={s.bubbleImage} resizeMode="cover" />
        </TouchableOpacity>
        {mascotState === 'highlight' && (
          <View style={s.badge}>
            <View style={s.badgeDot} />
          </View>
        )}
      </Animated.View>

      {/* Guide Panel - Custom Animated (replaces Modal) */}
      {panelOpen && (
        <View style={s.overlayAbsolute}>
          <Animated.View style={[s.overlayBg, { opacity: panelOpacityAnim }]}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleClose} />
          </Animated.View>
          <Animated.View style={[s.panel, { transform: [{ translateY: panelSlideAnim }] }]}>
              {/* Panel Header with VERO */}
              <View style={s.panelHeader}>
                <View style={s.panelHeaderLeft}>
                  <Image source={currentImage} style={s.panelAvatar} resizeMode="cover" />
                  <View>
                    <Text style={s.panelTitle}>VERO</Text>
                    <Text style={s.panelSubtitle}>
                      {lang === 'de' ? 'Dein Gesundheitsbegleiter' : 'Il tuo accompagnatore'}
                    </Text>
                  </View>
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
                  <Image source={currentImage} style={s.messageAvatar} resizeMode="cover" />
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

                {/* Hide Guide */}
                <TouchableOpacity
                  style={s.hideBtn}
                  onPress={() => { guide.hideGuide(); handleClose(); }}
                  data-testid="guide-hide-btn"
                >
                  <MaterialCommunityIcons name="eye-off-outline" size={14} color="#94A3B8" />
                  <Text style={s.hideText}>
                    {lang === 'de' ? 'VERO ausblenden' : 'Nascondi VERO'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
        </View>
      )}

      {/* Onboarding Tour */}
      {showOnboarding && !guide.onboardingComplete && (
        <OnboardingTourModal
          lang={lang}
          firstName={firstName}
          onComplete={() => { guide.completeOnboarding(); setShowOnboarding(false); }}
          onSkip={() => { guide.completeOnboarding(); setShowOnboarding(false); }}
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
  const slideAnim = useRef(new Animated.Value(0)).current;
  const avatarScaleAnim = useRef(new Animated.Value(1)).current;
  const current = ONBOARDING_TOUR[step];
  const isLast = step === ONBOARDING_TOUR.length - 1;
  const stepImage = getVeroImage(current.pose);

  const animateTransition = (nextStep: number) => {
    const direction = nextStep > step ? -30 : 30;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: direction, duration: 150, useNativeDriver: true }),
      Animated.timing(avatarScaleAnim, { toValue: 0.85, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(-direction);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }),
        Animated.spring(avatarScaleAnim, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
      ]).start();
    });
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={s.overlay}>
        <View style={s.onboardingCard}>
          {/* VERO Avatar */}
          <Animated.View style={[s.onboardingAvatarWrap, { transform: [{ scale: avatarScaleAnim }] }]}>
            <Image source={stepImage} style={s.onboardingAvatar} resizeMode="contain" />
          </Animated.View>

          {/* Progress Dots */}
          <View style={s.dots}>
            {ONBOARDING_TOUR.map((_, i) => (
              <View key={i} style={[s.dot, i === step && s.dotActive]} />
            ))}
          </View>

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }], alignItems: 'center', width: '100%' }}>
            {/* Icon + Title */}
            <View style={s.onboardingTitleRow}>
              <View style={s.onboardingIconWrap}>
                <MaterialCommunityIcons name={current.icon as any} size={20} color="#4A8B71" />
              </View>
              <Text style={s.onboardingTitle}>
                {step === 0 && firstName
                  ? `Hallo ${firstName}!`
                  : t(current.title, lang)}
              </Text>
            </View>

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
    bottom: Platform.OS === 'web' ? 90 : 110,
    right: 16,
    zIndex: 999,
  },
  bubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  bubbleImage: {
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F59E0B',
  },

  // Overlay (for Onboarding)
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },

  // Overlay Absolute (for Panel - not a Modal)
  overlayAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'flex-end',
  },
  overlayBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  // Guide Panel
  panel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: Dimensions.get('window').height * 0.6,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  panelHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  panelAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8F5E9',
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A2D26',
    letterSpacing: 0.5,
  },
  panelSubtitle: {
    fontSize: 11,
    color: '#5C7A6F',
    marginTop: 1,
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
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  messageAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
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
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
    borderRadius: 24,
    padding: 24,
    paddingTop: 0,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  onboardingAvatarWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0FAF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -60,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
  },
  onboardingAvatar: {
    width: 110,
    height: 110,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
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
  onboardingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  onboardingIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onboardingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2D26',
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
    marginTop: 14,
    fontSize: 12,
    color: '#94A3B8',
  },
});
