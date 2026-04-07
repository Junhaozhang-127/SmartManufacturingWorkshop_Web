import { IsOptional, IsString, Max, Min } from 'class-validator';

export class InventoryTxnQueryDto {
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
  txnType?: string;

  @IsOptional()
  @IsString()
  consumableId?: string;
}
