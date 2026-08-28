export type GreetingKey =
  | 'greeting.morning'
  | 'greeting.day'
  | 'greeting.evening';

/**
 * Tageszeit-abhängige Begrüßung (docs/04 /today). Liefert einen i18n-Key,
 * die App rendert den lokalisierten Text.
 *  05–11 Uhr → Morgen · 11–18 Uhr → Tag · sonst → Abend
 */
export function greetingKey(hour: number): GreetingKey {
  if (hour >= 5 && hour < 11) return 'greeting.morning';
  if (hour >= 11 && hour < 18) return 'greeting.day';
  return 'greeting.evening';
}
