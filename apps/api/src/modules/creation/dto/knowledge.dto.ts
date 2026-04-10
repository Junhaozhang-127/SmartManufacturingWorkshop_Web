import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class KnowledgeListQueryDto {
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

