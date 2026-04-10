import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class PortalAdminCarouselListQueryDto {
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
  @IsIn(['ACTIVE', 'INACTIVE'])
  statusCode?: 'ACTIVE' | 'INACTIVE';
}

export class UpsertPortalCarouselItemDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  imageStorageKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  imageFileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  targetUrl?: string;

  @IsOptional()
  @IsIn(['blue', 'gold', 'teal'])
  themeCode?: 'blue' | 'gold' | 'teal';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  statusCode?: 'ACTIVE' | 'INACTIVE';
}

