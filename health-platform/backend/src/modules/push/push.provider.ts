import { Logger } from '@nestjs/common';

export const PUSH_PROVIDER = Symbol('PUSH_PROVIDER');

export interface PushPayload {
  /** i18n-Keys – KEINE Gesundheitswerte im Klartext (docs/16). */
  titleKey: string;
  bodyKey: string;
  params?: Record<string, string | number>;
}

export interface PushProvider {
  send(
    token: string,
    platform: string,
    payload: PushPayload,
  ): Promise<void>;
}

/**
 * Platzhalter-Provider: loggt nur. Ersetzt durch echte FCM/APNs-Anbindung,
 * sobald die Zugänge vorliegen (docs/16). Bewusst neutrale Payload.
 */
export class NoopPushProvider implements PushProvider {
  private readonly logger = new Logger('NoopPushProvider');

  async send(
    token: string,
    platform: string,
    payload: PushPayload,
  ): Promise<void> {
    this.logger.debug(
      `[noop] push -> ${platform}:${token.slice(0, 8)}… ${payload.titleKey}`,
    );
  }
}
