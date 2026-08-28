import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PushController } from './push.controller';
import { PushService } from './push.service';
import {
  NoopPushProvider,
  PUSH_PROVIDER,
  PushProvider,
} from './push.provider';
import { FcmHttpV1Provider } from './fcm-provider';

@Module({
  controllers: [PushController],
  providers: [
    PushService,
    {
      provide: PUSH_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): PushProvider => {
        const provider = config.get<string>('push.provider');
        const projectId = config.get<string>('push.fcmProjectId') ?? '';
        if (provider === 'fcm' && projectId) {
          return new FcmHttpV1Provider(projectId);
        }
        // Default/Fallback: Noop (loggt nur), solange FCM nicht konfiguriert ist.
        return new NoopPushProvider();
      },
    },
  ],
  exports: [PushService],
})
export class PushModule {}
