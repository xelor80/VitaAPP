import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export enum ConnectionEventDto {
  connected = 'connected',
  disconnected = 'disconnected',
  sync_ok = 'sync_ok',
  sync_error = 'sync_error',
  ble_error = 'ble_error',
}

export class CreateConnectionEventDto {
  @IsEnum(ConnectionEventDto)
  event!: ConnectionEventDto;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  battery?: number;

  // Nur Diagnosedaten – KEINE Gesundheitsdaten (siehe docs/09 & docs/45).
  @IsOptional()
  @IsObject()
  detail?: Record<string, unknown>;
}
