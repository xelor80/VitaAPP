import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withSequence, withSpring, Easing, FadeIn,
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient as SvgGrad, Stop, Rect, ClipPath, Ellipse } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showActionToast } from './ActionToast';

const { width: SW } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// ── Animated Water Glass SVG ──
function WaterGlass({ percentage }: { percentage: number }) {
  const glassW = 80;
  const glassH = 100;
  const wallT = 3;
  const innerW = glassW - wallT * 2;
  const innerH = glassH - wallT - 8;
  const fillH = Math.max(0, (percentage / 100) * innerH);
  const fillY = wallT + innerH - fillH;
  // Wave offset
  const wave1 = `M ${wallT} ${fillY} Q ${wallT + innerW * 0.25} ${fillY - 5} ${wallT + innerW * 0.5} ${fillY} T ${wallT + innerW} ${fillY} L ${wallT + innerW} ${wallT + innerH} L ${wallT} ${wallT + innerH} Z`;

  return (
    <Svg width={glassW} height={glassH} viewBox={`0 0 ${glassW} ${glassH}`}>
      <Defs>
        <SvgGrad id="waterFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#7DD3FC" stopOpacity="0.6" />
          <Stop offset="1" stopColor="#3B82F6" stopOpacity="0.85" />
        </SvgGrad>
        <ClipPath id="glassClip">
          <Rect x={wallT} y={wallT} width={innerW} height={innerH} rx={4} />
        </ClipPath>
      </Defs>
      {/* Glass outline */}
      <Rect x={1} y={1} width={glassW - 2} height={glassH - 2} rx={8} ry={8}
        fill="rgba(219,234,254,0.3)" stroke="#BAD7F2" strokeWidth={2} />
      {/* Water fill */}
      <Path d={wave1} fill="url(#waterFill)" clipPath="url(#glassClip)" />
      {/* Bubbles when has water */}
      {percentage > 10 && (
        <>
          <Ellipse cx={glassW * 0.35} cy={fillY + fillH * 0.3} rx={2} ry={2} fill="rgba(255,255,255,0.5)" />
          <Ellipse cx={glassW * 0.6} cy={fillY + fillH * 0.5} rx={1.5} ry={1.5} fill="rgba(255,255,255,0.4)" />
          <Ellipse cx={glassW * 0.45} cy={fillY + fillH * 0.7} rx={2.5} ry={2.5} fill="rgba(255,255,255,0.35)" />
        </>
      )}
    </Svg>
  );
}

// ── Speech Bubble ──
function SpeechBubble({ text }: { text: string }) {
  if (!text) return null;
  return (
    <View style={st.bubble}>
      <Text style={st.bubbleText}>{text}</Text>
      <View style={st.bubbleTail} />
    </View>
  );
}

interface WaterTrackerCardProps {
  profileId: string | null;
  lang: string;
  waterData: any;
  onDataUpdate: () => void;
  onWaterUpdate?: (data: any) => void;
  onNavigate: () => void;
}

export function WaterTrackerCard({ profileId, lang, waterData, onDataUpdate, onWaterUpdate, onNavigate }: WaterTrackerCardProps) {
  const [adding, setAdding] = useState(false);

  // Wave animation
  const waveX = useSharedValue(0);
  const splashScale = useSharedValue(1);

  useEffect(() => {
    waveX.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ), -1, true
    );
  }, []);

  const glassStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: waveX.value * 2 },
      { scale: splashScale.value },
    ],
  }));

  const addWater = async (amount: number) => {
    if (!profileId || amount <= 0 || adding) return;
    setAdding(true);

    // Splash animation - bigger bounce
    splashScale.value = withSequence(
      withSpring(1.18, { damping: 3, stiffness: 200 }),
      withSpring(0.95, { damping: 6 }),
      withSpring(1, { damping: 10 })
    );

    // Save timestamp for smart reminder suppression
    AsyncStorage.setItem('last_water_time', Date.now().toString()).catch(() => {});

    // Optimistic UI: Update local waterData immediately
    if (waterData) {
      const newTotal = (waterData.total_ml || 0) + amount;
      const goal = waterData.daily_goal_ml || 2400;
      const newPct = Math.min(100, Math.round((newTotal / goal) * 100));
      const newRemain = Math.max(0, goal - newTotal);
      const optimistic = {
        ...waterData,
        total_ml: newTotal,
        percentage: newPct,
        remaining_ml: newRemain,
      };
      if (onWaterUpdate) onWaterUpdate(optimistic);
      // Show action toast
      showActionToast(`+${amount} ml`, 2, 'water', '#0EA5E9');
    }

    // Release UI immediately
    setTimeout(() => setAdding(false), 300);

    // Fire API call in background
    fetch(`${API_URL}/api/water-tracking/${profileId}/add?lang=${lang}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount_ml: amount }),
    }).then(res => {
      if (res.ok) {
        // Silently refresh real data in background
        onDataUpdate();
      }
    }).catch(() => {});
  };

  if (!profileId) return null;

  const pct = waterData?.percentage || 0;
  const totalL = ((waterData?.total_ml || 0) / 1000).toFixed(1);
  const goalL = ((waterData?.daily_goal_ml || 2400) / 1000).toFixed(1);
  const remainL = ((waterData?.remaining_ml || 0) / 1000).toFixed(1);
  const veroMsg = waterData?.vero_message?.text || '';
  const quickAmounts = [100, 200, 250, 500];

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={onNavigate}
      testID="water-tracking-card"
    >
      <View style={st.card}>
        <LinearGradient
          colors={['#F0F9F4', '#E8F5EE', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={st.cardGradient}
        >
          {/* Top Row: Title + Speech Bubble */}
          <View style={st.topRow}>
            <Text style={st.title}>{lang === 'de' ? 'Wasseraufnahme' : 'Idratazione'}</Text>
            {veroMsg ? <SpeechBubble text={veroMsg} /> : null}
          </View>

          {/* Middle: Glass + Stats */}
          <View style={st.middleRow}>
            {/* Animated Glass */}
            <Animated.View style={[st.glassWrap, glassStyle]}>
              <WaterGlass percentage={pct} />
            </Animated.View>

            {/* Stats */}
            <View style={st.statsCol}>
              <Text style={st.statsMain}>{totalL} / {goalL} L</Text>
              <Text style={st.statsPct}>{pct}%</Text>
              {/* Progress Bar */}
              <View style={st.progressBg}>
                <Animated.View style={[st.progressFill, { width: `${Math.min(pct, 100)}%` as any }]} />
              </View>
              <Text style={st.statsRemain}>
                {pct >= 100
                  ? (lang === 'de' ? 'Tagesziel erreicht!' : 'Obiettivo raggiunto!')
                  : (lang === 'de' ? `Noch ${remainL} L bis zum Ziel` : `Ancora ${remainL} L`)}
              </Text>
            </View>
          </View>

          {/* Quick-Add Buttons */}
          <View style={st.buttonsRow}>
            {quickAmounts.map((amt) => (
              <TouchableOpacity
                key={amt}
                style={st.quickBtn}
                activeOpacity={0.7}
                onPress={(e) => { e.stopPropagation?.(); addWater(amt); }}
                disabled={adding}
                testID={`dashboard-add-water-${amt}`}
              >
                <Text style={st.quickBtnText}>+{amt} ml</Text>
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#1B6B45',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    backgroundColor: '#FFF',
  },
  cardGradient: {
    padding: 16,
    paddingBottom: 14,
  },
  // Top row
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A3C34',
    letterSpacing: -0.3,
  },
  // Speech bubble
  bubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: SW * 0.45,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E8F0EC',
  },
  bubbleText: {
    fontSize: 12,
    color: '#2D6A4F',
    lineHeight: 16,
    fontWeight: '500',
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -6,
    left: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
  },
  // Middle row
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  glassWrap: {
    marginRight: 16,
  },
  statsCol: {
    flex: 1,
  },
  statsMain: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A2E35',
    letterSpacing: -0.5,
  },
  statsPct: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D9E6B',
    marginTop: 2,
  },
  progressBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#E0EDE6',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: 8,
    backgroundColor: '#2D9E6B',
    borderRadius: 4,
  },
  statsRemain: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 6,
    fontWeight: '500',
  },
  // Quick-add buttons
  buttonsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#DEE8E2',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  quickBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
});
