// Simple event bus for cross-screen communication
type Listener = () => void;
const listeners: Record<string, Listener[]> = {};

export const eventBus = {
  on(event: string, fn: Listener) {
    (listeners[event] ??= []).push(fn);
  },
  off(event: string, fn: Listener) {
    listeners[event] = (listeners[event] ?? []).filter(l => l !== fn);
  },
  emit(event: string) {
    (listeners[event] ?? []).forEach(fn => fn());
  },
};
