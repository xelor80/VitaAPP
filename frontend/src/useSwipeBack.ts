import { useRef, useEffect } from 'react';
import { PanResponder, GestureResponderEvent, PanResponderGestureState } from 'react-native';
import { useRouter, usePathname } from 'expo-router';

const SWIPE_THRESHOLD = 80;
const VELOCITY_THRESHOLD = 0.3;
const EDGE_WIDTH = 40;

// Paths where swipe-back should be disabled (home/dashboard)
const HOME_PATHS = ['/', '/index', '/(tabs)', '/(tabs)/index'];

// Tab paths that should swipe back to home
const TAB_PATHS = ['/profile', '/plan', '/recipes', '/(tabs)/profile', '/(tabs)/plan', '/(tabs)/recipes'];

export function useSwipeBack() {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const routerRef = useRef(router);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      // Use Capture to override ScrollView for edge swipes
      onMoveShouldSetPanResponderCapture: (e: GestureResponderEvent, gs: PanResponderGestureState) => {
        const currentPath = pathnameRef.current || '/';
        if (HOME_PATHS.includes(currentPath)) return false;
        const startX = (e.nativeEvent as any).pageX - gs.dx;
        if (startX > EDGE_WIDTH) return false;
        return gs.dx > 12 && Math.abs(gs.dy) < Math.abs(gs.dx);
      },
      onPanResponderRelease: (_e: GestureResponderEvent, gs: PanResponderGestureState) => {
        if (gs.dx > SWIPE_THRESHOLD || gs.vx > VELOCITY_THRESHOLD) {
          const currentPath = pathnameRef.current || '/';
          const r = routerRef.current;
          // If on a non-home tab, navigate to home tab
          if (TAB_PATHS.includes(currentPath) || currentPath.startsWith('/(tabs)/')) {
            r.navigate('/(tabs)' as any);
          } else {
            // For stack screens, go back normally
            try { r.back(); } catch {}
          }
        }
      },
    })
  ).current;

  return panResponder.panHandlers;
}
