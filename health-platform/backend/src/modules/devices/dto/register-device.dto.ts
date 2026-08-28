import {
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  vendor!: string;

  @IsString()
  model!: string;

  @IsString()
  providerKey!: string; // z. B. "veepoo_hband_v1"

  @IsOptional()
  @IsString()
  serial?: string;

  @IsOptional()
  @IsString()
  firmware?: string;

  // Aus der Capability-Discovery (siehe docs/07 & docs/19)
  @IsOptional()
  @IsObject()
  capabilities?: Record<string, unknown>;
}
