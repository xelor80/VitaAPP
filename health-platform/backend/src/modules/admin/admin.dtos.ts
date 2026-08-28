import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

const SEVERITIES = ['info', 'hint', 'notable', 'important'] as const;
const CONTENT_STATUS = ['draft', 'published', 'archived'] as const;

export class AdminLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class SetUserStatusDto {
  @IsIn(['active', 'suspended', 'deleted'])
  status!: 'active' | 'suspended' | 'deleted';
}

export class PutConfigDto {
  @IsObject()
  value!: Record<string, unknown>;
}

export class CreateRuleDto {
  @IsString() metric!: string;
  @IsObject() definition!: Record<string, unknown>;
  @IsIn(SEVERITIES) severity!: (typeof SEVERITIES)[number];
  @IsOptional() @IsBoolean() notify?: boolean;
  @IsObject() contentKey!: Record<string, unknown>;
  @IsOptional() @IsObject() scope?: Record<string, unknown>;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateRuleDto {
  @IsOptional() @IsObject() definition?: Record<string, unknown>;
  @IsOptional() @IsIn(SEVERITIES) severity?: (typeof SEVERITIES)[number];
  @IsOptional() @IsBoolean() notify?: boolean;
  @IsOptional() @IsObject() contentKey?: Record<string, unknown>;
  @IsOptional() @IsObject() scope?: Record<string, unknown>;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateProductDto {
  @IsString() name!: string;
  @IsOptional() @IsString() manufacturer?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsNumber() priority?: number;
  @IsOptional() @IsNumber() recommendationWeight?: number;
}

export class UpdateProductDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() manufacturer?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsNumber() priority?: number;
  @IsOptional() @IsNumber() recommendationWeight?: number;
}

export class CreateArticleDto {
  @IsString() slug!: string;
  @IsString() title!: string;
  @IsString() body!: string;
  @IsString() category!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsIn(CONTENT_STATUS) status?: (typeof CONTENT_STATUS)[number];
  @IsOptional() @IsString() locale?: string;
}

export class UpdateArticleDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsIn(CONTENT_STATUS) status?: (typeof CONTENT_STATUS)[number];
  @IsOptional() @IsString() locale?: string;
}
