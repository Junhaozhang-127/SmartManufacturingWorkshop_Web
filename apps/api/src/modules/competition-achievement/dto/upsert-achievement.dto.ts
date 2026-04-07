import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class AchievementContributorDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  @MaxLength(128)
  contributorName!: string;

  @IsString()
  @MaxLength(32)
  contributorRole!: string;

  @IsInt()
  @Min(1)
  contributionRank!: number;

  @IsBoolean()
  isInternal!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  contributionDescription?: string;
}

class AchievementPaperDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  journalName?: string;

  @IsOptional()
  @IsDateString()
  publishDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  doi?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  indexedBy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  authorOrder?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  correspondingAuthor?: string;
}

class IpAssetDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  assetType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  certificateNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  registrationNo?: string;

  @IsOptional()
  @IsDateString()
  authorizedDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  ownerUnit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarks?: string;
}

export class UpsertAchievementDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsString()
  @MaxLength(32)
  achievementType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  levelCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  projectId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  projectName?: string;

  @IsOptional()
  @IsString()
  sourceCompetitionId?: string;

  @IsOptional()
  @IsString()
  sourceTeamId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AchievementContributorDto)
  contributors!: AchievementContributorDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => AchievementPaperDto)
  paper?: AchievementPaperDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => IpAssetDto)
  ipAsset?: IpAssetDto;

  @IsBoolean()
  submitForApproval = false;
}
