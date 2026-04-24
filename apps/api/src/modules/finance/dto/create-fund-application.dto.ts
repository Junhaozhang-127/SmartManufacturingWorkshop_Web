import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class AttachmentDto {
  @IsString()
  @MaxLength(255)
  storageKey!: string;

  @IsString()
  @MaxLength(255)
  fileName!: string;

  @IsString()
  @MaxLength(500)
  downloadUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  mimeType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  size?: number;
}

export class CreateFundApplicationDto {
  @IsString()
  accountId!: string;

  @IsString()
  @MaxLength(32)
  applicationType!: string;

  @IsString()
  @MaxLength(32)
  expenseType!: string;

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsString()
  @MaxLength(1000)
  purpose!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

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
  @IsString()
  @MaxLength(64)
  projectId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  projectName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  relatedBusinessType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  relatedBusinessId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @IsOptional()
  @IsArray()
  attachmentFileIds?: string[];

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  submitForApproval?: boolean;

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
