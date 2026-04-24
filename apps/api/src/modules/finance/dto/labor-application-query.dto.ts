import { IsOptional, IsString } from 'class-validator';

export class LaborApplicationQueryDto {
  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  statusCode?: string;
}

