import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class PromotionApplicationQueryDto {
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
  statusCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  targetPositionCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  keyword?: string;
}
