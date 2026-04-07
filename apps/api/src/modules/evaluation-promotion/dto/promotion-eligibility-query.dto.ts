import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class PromotionEligibilityQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize = 10;

  @IsOptional()
  @IsString()
  schemeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  targetPositionCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  keyword?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : value === 'true' || value === true))
  @IsBoolean()
  qualified?: boolean;
}
