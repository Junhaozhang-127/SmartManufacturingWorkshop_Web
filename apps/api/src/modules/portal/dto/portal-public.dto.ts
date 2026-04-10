import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class PortalPublicContentListQueryDto {
  @IsIn(['NEWS', 'NOTICE', 'ACHIEVEMENT', 'COMPETITION', 'MEMBER_INTRO'])
  contentType!: 'NEWS' | 'NOTICE' | 'ACHIEVEMENT' | 'COMPETITION' | 'MEMBER_INTRO';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageSize?: number;
}

export class PortalFilePreviewQueryDto {
  @IsString()
  key!: string;
}

