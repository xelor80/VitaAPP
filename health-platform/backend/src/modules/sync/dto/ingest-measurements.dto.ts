import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export enum SourceDto {
  wearable = 'wearable',
  manual = 'manual',
  healthkit = 'healthkit',
  health_connect = 'health_connect',
}

export enum QualityDto {
  good = 'good',
  fair = 'fair',
  poor = 'poor',
  unknown = 'unknown',
}

export class MeasurementInputDto {
  @IsString()
  metric!: string;

  @IsNumber()
  value!: number;

  @IsString()
  unit!: string;

  @IsISO8601()
  time!: string;

  @IsOptional()
  @IsEnum(SourceDto)
  source?: SourceDto;

  @IsOptional()
  @IsEnum(QualityDto)
  quality?: QualityDto;

  @IsString()
  ingestKey!: string;
}

export class IngestMeasurementsDto {
  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => MeasurementInputDto)
  measurements!: MeasurementInputDto[];
}
