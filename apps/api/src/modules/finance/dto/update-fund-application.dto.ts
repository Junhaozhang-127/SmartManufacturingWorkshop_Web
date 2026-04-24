import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateFundApplicationDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  applicationType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  expenseType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  purpose?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  reimbursementAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  payeeName?: string;

  @IsOptional()
  @IsArray()
  attachmentFileIds?: string[];

  @IsOptional()
  @IsArray()
  orderAttachmentFileIds?: string[];

  @IsOptional()
  @IsArray()
  invoiceAttachmentFileIds?: string[];

  @IsOptional()
  @IsArray()
  goodsAttachmentFileIds?: string[];
}

