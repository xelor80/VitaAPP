import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withDelay, runOnJS } from 'react-native-reanimated';
import { eventBus } from '../src/eventBus';

interface ToastData {
  message: string;
  points?: number;
  icon?: string;
  color?: string;
}

const VERO_CHEERS = [
  'Stark!', 'Weiter so!', 'Super!', 'Toll gemacht!', 'Perfekt!',
  'Bravo!', 'Ottimo!', 'Bene!', 'Fantastico!',
];

export function ActionToast() {
  const [toast, setToast] = useState<ToastData | null>(null);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);

  const hideToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    const show = (data: ToastData) => {
      setToast(data);
      opacity.value = withSequence(
        withTiming(1, { duration: 250 }),
        withDelay(2200, withTiming(0, { duration: 400 }, () => runOnJS(hideToast)()))
      );
      translateY.value = withSequence(
        withTiming(0, { duration: 300 }),
        withDelay(2200, withTiming(-20, { duration: 400 }))
      );
    };
    eventBus.on('showActionToast', show);
    return () => eventBus.off('showActionToast', show);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!toast) return null;

  const cheer = VERO_CHEERS[Math.floor(Math.random() * VERO_CHEERS.length)];

  return (
    <Animated.View style={[s.container, animStyle]} pointerEvents="none">
      <View style={[s.toast, toast.color ? { borderLeftColor: toast.color } : {}]}>
        <MaterialCommunityIcons
          name={(toast.icon || 'check-circle') as any}
          size={20}
          color={toast.color || '#22C55E'}
        />
        <View style={s.textCol}>
          <Text style={s.message}>{toast.message}</Text>
          {toast.points && toast.points > 0 && (
            <Text style={s.points}>+{toast.points} Punkte</Text>
          )}
        </View>
        <Text style={s.cheer}>{cheer}</Text>
      </View>
    </Animated.View>
  );
}

// Helper to trigger toast from anywhere
export function showActionToast(message: string, points?: number, icon?: string, color?: string) {
  eventBus.emit('showActionToast', { message, points, icon, color });
}

const s = StyleSheet.create({
  container: {
    position: 'absolute', top: 60, left: 16, right: 16, zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 14, padding: 12, paddingHorizontal: 16,
    borderLeftWidth: 4, borderLeftColor: '#22C55E',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12,
    elevation: 6, maxWidth: 360,
  },
  textCol: { flex: 1 },
  message: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  points: { fontSize: 13, fontWeight: '700', color: '#22C55E', marginTop: 1 },
  cheer: { fontSize: 13, fontWeight: '700', color: '#F59E0B' },
});
