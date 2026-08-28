import { Logger } from '@nestjs/common';
import { GoogleAuth } from 'google-auth-library';
import { PushPayload, PushProvider } from './push.provider';

/**
 * FCM HTTP v1 Provider. Deckt iOS **und** Android ab, da die App auf beiden
 * Plattformen FCM-Tokens verwendet (docs/02). Authentifizierung über ein
 * Service-Account (GOOGLE_APPLICATION_CREDENTIALS).
 *
 * Bewusst **Data-Only-Nachricht** mit i18n-Keys – keine Gesundheitswerte im
 * Klartext (docs/16); die App baut die lokalisierte Notification selbst.
 */
export class FcmHttpV1Provider implements PushProvider {
  private readonly logger = new Logger('FcmHttpV1Provider');
  private readonly auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });

  constructor(private readonly projectId: string) {}

  async send(
    token: string,
    _platform: string,
    payload: PushPayload,
  ): Promise<void> {
    const client = await this.auth.getClient();
    const accessToken = (await client.getAccessToken()).token;
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token,
            data: {
              titleKey: payload.titleKey,
              bodyKey: payload.bodyKey,
              params: JSON.stringify(payload.params ?? {}),
            },
          },
        }),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`FCM ${res.status}: ${body}`);
      throw new Error(`FCM send failed (${res.status})`);
    }
  }
}
