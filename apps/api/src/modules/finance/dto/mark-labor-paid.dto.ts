import { IsOptional, IsString, MaxLength } from 'class-validator';

export class MarkLaborPaidDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}

