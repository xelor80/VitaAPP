import { IsObject, IsOptional } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsObject()
  channels?: Record<string, boolean>; // { push: true, email: false }

  @IsOptional()
  @IsObject()
  categories?: Record<string, boolean>;

  @IsOptional()
  @IsObject()
  quietHours?: { from: string; to: string };
}
