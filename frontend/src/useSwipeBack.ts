import { useRef, useCallback } from 'react';
import { PanResponder, GestureResponderEvent, PanResponderGestureState } from 'react-native';
import { useRouter, usePathname } from 'expo-router';

const SWIPE_THRESHOLD = 80;
const VELOCITY_THRESHOLD = 0.3;
const EDGE_WIDTH = 40;

export function useSwipeBack() {
  const router = useRouter();
  const pathname = usePathname();

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_e: GestureResponderEvent, _gs: PanResponderGestureState) => false,
      onMoveShouldSetPanResponder: (e: GestureResponderEvent, gs: PanResponderGestureState) => {
        if (pathname === '/' || pathname === '/index') return false;
        const startX = (e.nativeEvent as any).pageX - gs.dx;
        if (startX > EDGE_WIDTH) return false;
        return gs.dx > 10 && Math.abs(gs.dy) < Math.abs(gs.dx);
      },
      onPanResponderRelease: (_e: GestureResponderEvent, gs: PanResponderGestureState) => {
        if (gs.dx > SWIPE_THRESHOLD || gs.vx > VELOCITY_THRESHOLD) {
          router.back();
        }
      },
    })
  ).current;

  return panResponder.panHandlers;
}
