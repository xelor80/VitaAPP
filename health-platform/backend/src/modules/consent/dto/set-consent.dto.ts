import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export enum ConsentTypeDto {
  health_processing = 'health_processing',
  terms = 'terms',
  privacy = 'privacy',
  marketing = 'marketing',
  ai_analysis = 'ai_analysis',
}

export class SetConsentDto {
  @IsEnum(ConsentTypeDto)
  type!: ConsentTypeDto;

  @IsString()
  version!: string;

  @IsBoolean()
  granted!: boolean;

  @IsOptional()
  @IsString()
  source?: string;
}
