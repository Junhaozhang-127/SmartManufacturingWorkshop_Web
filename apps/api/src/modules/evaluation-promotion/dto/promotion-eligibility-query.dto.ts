import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class PromotionEligibilityQueryDto {
  @Transform(({ value }) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 1 ? Math.trunc(parsed) : 1;
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Transform(({ value }) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(100, Math.max(1, Math.trunc(parsed))) : 10;
  })
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
