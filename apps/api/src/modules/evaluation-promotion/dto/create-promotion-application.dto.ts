import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePromotionApplicationDto {
  @IsString()
  memberProfileId!: string;

  @IsOptional()
  @IsString()
  schemeId?: string;

  @IsString()
  @MaxLength(32)
  targetPositionCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  targetRoleCode?: string;
}
