import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class MemberQueryDto {
  @Transform(({ value }) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 1 ? Math.trunc(parsed) : 1;
  })
  @IsInt()
  @Min(1)
  page = 1;

  @Transform(({ value }) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 10;
    return Math.min(100, Math.max(1, Math.trunc(parsed)));
  })
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 10;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  orgUnitId?: string;

  @IsOptional()
  @IsString()
  memberStatus?: string;

  @IsOptional()
  @IsString()
  statusCode?: string;

  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsOptional()
  @IsBoolean()
  viewAll?: boolean;
}
