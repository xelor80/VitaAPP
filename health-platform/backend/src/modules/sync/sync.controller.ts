import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { SyncService } from './sync.service';
import { IngestMeasurementsDto } from './dto/ingest-measurements.dto';

@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Post('measurements')
  @HttpCode(200)
  ingest(
    @CurrentUser() user: AuthUser,
    @Body() dto: IngestMeasurementsDto,
  ) {
    return this.sync.ingest(user.userId, dto);
  }

  @Get('status')
  status(@CurrentUser() user: AuthUser) {
    return this.sync.status(user.userId);
  }
}
