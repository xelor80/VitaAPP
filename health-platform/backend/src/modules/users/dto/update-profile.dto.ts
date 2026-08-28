import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum SexDto {
  female = 'female',
  male = 'male',
  diverse = 'diverse',
  unspecified = 'unspecified',
}

export enum ActivityLevelDto {
  low = 'low',
  moderate = 'moderate',
  high = 'high',
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear())
  birthYear?: number;

  @IsOptional()
  @IsEnum(SexDto)
  sex?: SexDto;

  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(260)
  heightCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(400)
  weightKg?: number;

  @IsOptional()
  @IsEnum(ActivityLevelDto)
  activityLevel?: ActivityLevelDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  goals?: string[];
}
