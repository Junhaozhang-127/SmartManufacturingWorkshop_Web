import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export type HomeSection = 'CAROUSEL' | 'NEWS' | 'NOTICE' | 'ACHIEVEMENT' | 'COMPETITION' | 'MEMBER_INTRO';

export class ReviewListQueryDto {
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
}

export class ApproveCreationContentDto {
  @IsOptional()
  @IsIn(['KNOWLEDGE', 'HOME', 'BOTH'])
  publishMode?: 'KNOWLEDGE' | 'HOME' | 'BOTH';

  @IsOptional()
  @IsIn(['CAROUSEL', 'NEWS', 'NOTICE', 'ACHIEVEMENT', 'COMPETITION', 'MEMBER_INTRO'])
  homeSection?: HomeSection;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewComment?: string;
}

export class RejectCreationContentDto {
  @IsString()
  @MaxLength(1000)
  reviewComment!: string;
}

export class PublishCreationContentDto {
  @IsOptional()
  @IsBoolean()
  inKnowledgeBase?: boolean;

  @IsOptional()
  @IsBoolean()
  recommendToHome?: boolean;

  @IsOptional()
  @IsIn(['CAROUSEL', 'NEWS', 'NOTICE', 'ACHIEVEMENT', 'COMPETITION', 'MEMBER_INTRO'])
  homeSection?: HomeSection;
}
