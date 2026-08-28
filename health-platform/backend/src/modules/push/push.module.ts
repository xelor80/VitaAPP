import { Module } from '@nestjs/common';
import { PushController } from './push.controller';
import { PushService } from './push.service';
import { NoopPushProvider, PUSH_PROVIDER } from './push.provider';

@Module({
  controllers: [PushController],
  providers: [
    PushService,
    { provide: PUSH_PROVIDER, useClass: NoopPushProvider },
  ],
  exports: [PushService],
})
export class PushModule {}
