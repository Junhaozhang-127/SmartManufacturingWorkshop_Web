import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CompetitionQueryDto {
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
  statusCode?: string;

  @IsOptional()
  @IsString()
  competitionLevel?: string;

  @IsOptional()
  @IsString()
  involvedField?: string;
}
