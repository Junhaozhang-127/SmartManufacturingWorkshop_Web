import { ApprovalCenterTab } from '@smw/shared';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ApprovalCenterQueryDto {
  @IsOptional()
  @IsEnum(ApprovalCenterTab)
  tab?: ApprovalCenterTab;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  page?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  pageSize?: number;

  @IsOptional()
  @IsString()
  keyword?: string;
}
