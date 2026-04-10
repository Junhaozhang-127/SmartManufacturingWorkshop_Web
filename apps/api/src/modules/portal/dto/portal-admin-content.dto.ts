import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class PortalAdminContentListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageSize?: number;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsIn(['NEWS', 'NOTICE', 'ACHIEVEMENT', 'COMPETITION', 'MEMBER_INTRO'])
  contentType?: 'NEWS' | 'NOTICE' | 'ACHIEVEMENT' | 'COMPETITION' | 'MEMBER_INTRO';

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  statusCode?: 'ACTIVE' | 'INACTIVE';
}

export class UpsertPortalContentDto {
  @IsIn(['NEWS', 'NOTICE', 'ACHIEVEMENT', 'COMPETITION', 'MEMBER_INTRO'])
  contentType!: 'NEWS' | 'NOTICE' | 'ACHIEVEMENT' | 'COMPETITION' | 'MEMBER_INTRO';

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  summary?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  coverStorageKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  coverFileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  linkUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  statusCode?: 'ACTIVE' | 'INACTIVE';
}

