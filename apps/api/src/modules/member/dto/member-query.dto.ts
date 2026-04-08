import { IsOptional, IsString, Max, Min } from 'class-validator';

export class MemberQueryDto {
  @Min(1)
  page = 1;

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
}
